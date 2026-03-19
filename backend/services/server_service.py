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


def get_server_status() -> list[dict[str, Any]]:
    """Scan all projects for running servers based on known ports."""
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

            port = _parse_port_from_metadata(project_dir)
            if port is None:
                continue

            port_info = _check_port_in_use(port)
            has_run_sh = (project_dir / "run.sh").exists()

            statuses.append({
                "project_name": project_dir.name,
                "stage": stage,
                "port": port,
                "running": port_info is not None and port_info.get("in_use", False),
                "pids": port_info["pids"] if port_info else [],
                "has_run_sh": has_run_sh,
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
