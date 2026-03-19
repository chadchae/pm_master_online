"""Server control service for managing project dev servers."""

import asyncio
import os
import re
import subprocess
from pathlib import Path
from typing import Any

PROJECTS_ROOT = Path(os.environ.get("PROJECTS_ROOT", os.path.expanduser("~/Projects")))

# Stage folder names
STAGE_PREFIXES = [
    "0_project_development_documents",
    "1_idea_stage",
    "2_initiation_stage",
    "3_in_development",
    "4_in_testing",
    "5_completed",
    "6_archived",
    "7_discarded",
]


def _find_project_path(project_name: str) -> Path | None:
    """Find a project by name across all stage folders."""
    for stage in STAGE_PREFIXES:
        candidate = PROJECTS_ROOT / stage / project_name
        if candidate.is_dir():
            return candidate
    return None


def _parse_port_from_metadata(project_path: Path) -> int | None:
    """Extract port number from project's _아이디어노트.md metadata."""
    idea_note = project_path / "docs" / "_아이디어노트.md"
    if not idea_note.exists():
        return None

    try:
        content = idea_note.read_text(encoding="utf-8")
        for line in content.splitlines():
            line = line.strip()
            if line.startswith(">"):
                cleaned = line.lstrip(">").strip()
                match = re.match(r"^포트:\s*(\d+)", cleaned)
                if match:
                    return int(match.group(1))
    except (OSError, UnicodeDecodeError):
        pass
    return None


def _check_port_in_use(port: int) -> dict[str, Any] | None:
    """Check if a port is in use and return process info."""
    try:
        result = subprocess.run(
            ["lsof", "-i", f":{port}", "-P", "-n", "-t"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0 and result.stdout.strip():
            pids = result.stdout.strip().split("\n")
            return {
                "port": port,
                "in_use": True,
                "pids": pids,
            }
    except (subprocess.TimeoutExpired, OSError):
        pass
    return None


def _parse_ports(project_path: Path) -> dict[str, int | None]:
    """Parse backend and frontend ports from .run_ports or run.sh."""
    ports: dict[str, int | None] = {"backend": None, "frontend": None}

    # Try .run_ports first
    run_ports = project_path / ".run_ports"
    if run_ports.exists():
        try:
            content = run_ports.read_text()
            for line in content.splitlines():
                if "BACKEND_PORT" in line:
                    match = re.search(r"(\d+)", line)
                    if match:
                        ports["backend"] = int(match.group(1))
                if "FRONTEND_PORT" in line:
                    match = re.search(r"(\d+)", line)
                    if match:
                        ports["frontend"] = int(match.group(1))
        except OSError:
            pass

    # Fallback: parse run.sh defaults
    if not ports["backend"]:
        run_sh = project_path / "run.sh"
        if run_sh.exists():
            try:
                content = run_sh.read_text()
                for line in content.splitlines():
                    if "DEFAULT_BACKEND_PORT" in line and not ports["backend"]:
                        match = re.search(r"(\d+)", line)
                        if match:
                            ports["backend"] = int(match.group(1))
                    if "DEFAULT_FRONTEND_PORT" in line and not ports["frontend"]:
                        match = re.search(r"(\d+)", line)
                        if match:
                            ports["frontend"] = int(match.group(1))
            except OSError:
                pass

    # Fallback: use metadata port as backend
    if not ports["backend"]:
        ports["backend"] = _parse_port_from_metadata(project_path)

    return ports


def get_server_status() -> list[dict[str, Any]]:
    """Scan all projects for running servers based on known ports."""
    from services.scanner_service import _parse_idea_note

    statuses: list[dict[str, Any]] = []

    for stage in STAGE_PREFIXES:
        stage_path = PROJECTS_ROOT / stage
        if not stage_path.is_dir():
            continue

        for project_dir in stage_path.iterdir():
            if not project_dir.is_dir() or project_dir.name.startswith("."):
                continue
            if project_dir.name.startswith("_"):
                continue

            run_sh = project_dir / "run.sh"
            if not run_sh.exists():
                continue

            ports = _parse_ports(project_dir)
            if not ports["backend"] and not ports["frontend"]:
                continue

            # Check port status
            backend_alive = False
            frontend_alive = False
            backend_pid: str | None = None
            frontend_pid: str | None = None

            if ports["backend"]:
                info = _check_port_in_use(ports["backend"])
                if info and info.get("in_use"):
                    backend_alive = True
                    backend_pid = info["pids"][0] if info["pids"] else None

            if ports["frontend"]:
                info = _check_port_in_use(ports["frontend"])
                if info and info.get("in_use"):
                    frontend_alive = True
                    frontend_pid = info["pids"][0] if info["pids"] else None

            # Get metadata
            idea_note = project_dir / "docs" / "_아이디어노트.md"
            meta = _parse_idea_note(idea_note) if idea_note.exists() else {}

            statuses.append({
                "project_name": project_dir.name,
                "label": meta.get("label", project_dir.name),
                "description": meta.get("description", ""),
                "path": str(project_dir),
                "stage": stage,
                "backend_port": ports["backend"],
                "frontend_port": ports["frontend"],
                "backend_alive": backend_alive,
                "frontend_alive": frontend_alive,
                "backend_pid": backend_pid,
                "frontend_pid": frontend_pid,
                "has_run_sh": True,
                # Legacy fields for compatibility
                "port": ports["backend"] or ports["frontend"],
                "status": "running" if (backend_alive or frontend_alive) else "stopped",
                "pid": backend_pid or frontend_pid,
                "running": backend_alive or frontend_alive,
                "pids": [],
            })

    return statuses


async def run_server_command(
    project_name: str, command: str
) -> dict[str, Any]:
    """Run a server command (start/stop/restart) via run.sh.

    Args:
        project_name: Name of the project
        command: One of "start", "stop", "restart"

    Returns:
        Dict with success status, stdout, and stderr
    """
    if command not in ("start", "stop", "restart"):
        return {"success": False, "message": f"Invalid command: {command}"}

    project_path = _find_project_path(project_name)
    if project_path is None:
        return {"success": False, "message": f"Project not found: {project_name}"}

    run_sh = project_path / "run.sh"
    if not run_sh.exists():
        return {"success": False, "message": f"run.sh not found in {project_name}"}

    if not os.access(run_sh, os.X_OK):
        # Try to make it executable
        try:
            run_sh.chmod(0o755)
        except OSError:
            return {"success": False, "message": "run.sh is not executable"}

    try:
        process = await asyncio.create_subprocess_exec(
            str(run_sh),
            command,
            cwd=str(project_path),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(
            process.communicate(), timeout=30
        )

        return {
            "success": process.returncode == 0,
            "message": f"Server {command} executed",
            "stdout": stdout.decode("utf-8", errors="replace"),
            "stderr": stderr.decode("utf-8", errors="replace"),
            "return_code": process.returncode,
        }
    except asyncio.TimeoutError:
        return {
            "success": command == "start",
            "message": f"Command timed out (this may be normal for '{command}')",
        }
    except OSError as e:
        return {"success": False, "message": f"Failed to execute: {e}"}
