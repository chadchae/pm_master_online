"""Document browser service for reading/writing project markdown files."""

import os
from pathlib import Path
from typing import Any

PROJECTS_ROOT = Path(os.environ.get("PROJECTS_ROOT", os.path.expanduser("~/Projects")))

# Stage folder names for scanning
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


def list_docs(project_name: str, subpath: str = "") -> list[dict[str, Any]]:
    """List files in a project's docs/ directory (with optional subfolder)."""
    project_path = _find_project_path(project_name)
    if project_path is None:
        return []

    docs_dir = project_path / "docs"
    target = docs_dir / subpath if subpath else docs_dir

    # Security check
    try:
        resolved = target.resolve()
        if not str(resolved).startswith(str(docs_dir.resolve())):
            return []
    except (OSError, ValueError):
        return []

    if not target.is_dir():
        return []

    files: list[dict[str, Any]] = []
    for item in sorted(target.iterdir()):
        if item.name.startswith("."):
            continue
        if item.is_dir():
            files.append({
                "filename": item.name,
                "size": 0,
                "last_modified": item.stat().st_mtime if item.exists() else 0,
                "is_folder": True,
            })
        elif item.is_file() and item.suffix.lower() in (".md", ".markdown", ".txt"):
            try:
                stat = item.stat()
                files.append({
                    "filename": item.name,
                    "size": stat.st_size,
                    "last_modified": stat.st_mtime,
                    "is_folder": False,
                })
            except OSError:
                continue
    return files


def read_doc(project_name: str, filename: str) -> str | None:
    """Read a markdown file from a project's docs/ directory."""
    project_path = _find_project_path(project_name)
    if project_path is None:
        return None

    filepath = project_path / "docs" / filename
    # Security: prevent path traversal
    try:
        filepath = filepath.resolve()
        docs_dir = (project_path / "docs").resolve()
        if not str(filepath).startswith(str(docs_dir)):
            return None
    except (OSError, ValueError):
        return None

    if not filepath.is_file():
        return None

    try:
        return filepath.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return None


def write_doc(project_name: str, filename: str, content: str) -> dict[str, Any]:
    """Write/update a markdown file in a project's docs/ directory."""
    project_path = _find_project_path(project_name)
    if project_path is None:
        return {"success": False, "message": "Project not found"}

    docs_dir = project_path / "docs"
    docs_dir.mkdir(parents=True, exist_ok=True)

    filepath = docs_dir / filename
    # Security: prevent path traversal
    try:
        filepath = filepath.resolve()
        resolved_docs = docs_dir.resolve()
        if not str(filepath).startswith(str(resolved_docs)):
            return {"success": False, "message": "Invalid filename"}
    except (OSError, ValueError):
        return {"success": False, "message": "Invalid filename"}

    try:
        filepath.write_text(content, encoding="utf-8")
        return {"success": True, "message": f"Saved {filename}"}
    except OSError as e:
        return {"success": False, "message": f"Failed to save: {e}"}


def create_folder(project_name: str, folder_name: str) -> dict[str, Any]:
    """Create a subfolder in a project's docs/ directory."""
    project_path = _find_project_path(project_name)
    if project_path is None:
        return {"success": False, "message": "Project not found"}

    folder_path = project_path / "docs" / folder_name
    try:
        resolved = folder_path.resolve()
        docs_dir = (project_path / "docs").resolve()
        if not str(resolved).startswith(str(docs_dir)):
            return {"success": False, "message": "Invalid folder name"}
    except (OSError, ValueError):
        return {"success": False, "message": "Invalid folder name"}

    if folder_path.exists():
        return {"success": False, "message": "Folder already exists"}

    try:
        folder_path.mkdir(parents=True, exist_ok=True)
        return {"success": True, "message": f"Created folder {folder_name}"}
    except OSError as e:
        return {"success": False, "message": f"Failed: {e}"}


def delete_folder(project_name: str, folder_name: str) -> dict[str, Any]:
    """Delete a subfolder from a project's docs/ directory."""
    import shutil
    project_path = _find_project_path(project_name)
    if project_path is None:
        return {"success": False, "message": "Project not found"}

    folder_path = project_path / "docs" / folder_name
    try:
        resolved = folder_path.resolve()
        docs_dir = (project_path / "docs").resolve()
        if not str(resolved).startswith(str(docs_dir)) or resolved == docs_dir:
            return {"success": False, "message": "Invalid folder name"}
    except (OSError, ValueError):
        return {"success": False, "message": "Invalid folder name"}

    if not folder_path.is_dir():
        return {"success": False, "message": "Folder not found"}

    try:
        shutil.rmtree(str(folder_path))
        return {"success": True, "message": f"Deleted folder {folder_name}"}
    except OSError as e:
        return {"success": False, "message": f"Failed: {e}"}


def delete_doc(project_name: str, filename: str) -> dict[str, Any]:
    """Delete a file from a project's docs/ directory."""
    project_path = _find_project_path(project_name)
    if project_path is None:
        return {"success": False, "message": "Project not found"}

    filepath = project_path / "docs" / filename
    # Security: prevent path traversal
    try:
        filepath = filepath.resolve()
        docs_dir = (project_path / "docs").resolve()
        if not str(filepath).startswith(str(docs_dir)):
            return {"success": False, "message": "Invalid filename"}
    except (OSError, ValueError):
        return {"success": False, "message": "Invalid filename"}

    if not filepath.is_file():
        return {"success": False, "message": "File not found"}

    try:
        filepath.unlink()
        return {"success": True, "message": f"Deleted {filename}"}
    except OSError as e:
        return {"success": False, "message": f"Failed to delete: {e}"}


def search_docs(query: str) -> list[dict[str, Any]]:
    """Full-text search across all project docs."""
    if not query or len(query.strip()) < 2:
        return []

    query_lower = query.lower().strip()
    results: list[dict[str, Any]] = []

    for stage in STAGE_PREFIXES:
        stage_path = PROJECTS_ROOT / stage
        if not stage_path.is_dir():
            continue

        for project_dir in stage_path.iterdir():
            if not project_dir.is_dir() or project_dir.name.startswith("."):
                continue

            docs_dir = project_dir / "docs"
            if not docs_dir.is_dir():
                continue

            for doc_file in docs_dir.iterdir():
                if not doc_file.is_file():
                    continue
                if doc_file.suffix.lower() not in (".md", ".markdown", ".txt"):
                    continue

                try:
                    content = doc_file.read_text(encoding="utf-8")
                except (OSError, UnicodeDecodeError):
                    continue

                if query_lower in content.lower():
                    # Find matching lines for context
                    matching_lines: list[str] = []
                    for line in content.splitlines():
                        if query_lower in line.lower():
                            matching_lines.append(line.strip())
                            if len(matching_lines) >= 3:
                                break

                    results.append({
                        "project_name": project_dir.name,
                        "stage": stage,
                        "filename": doc_file.name,
                        "matches": matching_lines,
                    })

    return results
