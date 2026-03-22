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
        elif item.is_file() and item.suffix.lower() in (
            ".md", ".markdown", ".txt", ".pdf", ".docx", ".csv",
            ".py", ".r", ".rmd", ".qmd",
            ".js", ".ts", ".jsx", ".tsx", ".json", ".yaml", ".yml",
            ".sh", ".bash", ".zsh",
            ".html", ".css", ".xml", ".svg",
            ".sql", ".toml", ".ini", ".cfg", ".conf", ".env",
            ".tex", ".bib", ".rst",
            ".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v", ".flv", ".wmv", ".3gp", ".ogv", ".ts",
            ".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac", ".wma", ".opus", ".aiff", ".mid", ".midi", ".weba",
            ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".ico", ".tiff",
        ):
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


BINARY_EXTENSIONS = {
    ".pdf", ".docx",
    ".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v", ".flv", ".wmv", ".3gp", ".ogv", ".ts",
    ".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac", ".wma", ".opus", ".aiff", ".mid", ".midi", ".weba",
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".ico", ".tiff",
}


def read_doc_binary(project_name: str, filename: str) -> Path | None:
    """Return the resolved file path for a binary document (PDF/DOCX)."""
    project_path = _find_project_path(project_name)
    if project_path is None:
        return None

    filepath = project_path / "docs" / filename
    try:
        filepath = filepath.resolve()
        docs_dir = (project_path / "docs").resolve()
        if not str(filepath).startswith(str(docs_dir)):
            return None
    except (OSError, ValueError):
        return None

    if not filepath.is_file() or filepath.suffix.lower() not in BINARY_EXTENSIONS:
        return None

    return filepath


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
        filepath.parent.mkdir(parents=True, exist_ok=True)
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


def move_doc(project_name: str, src_path: str, dest_folder: str) -> dict[str, Any]:
    """Move a file or folder to a different subfolder within docs/."""
    import shutil
    project_path = _find_project_path(project_name)
    if project_path is None:
        return {"success": False, "message": "Project not found"}

    docs_dir = (project_path / "docs").resolve()
    src = (project_path / "docs" / src_path).resolve()
    if not str(src).startswith(str(docs_dir)) or src == docs_dir or not src.exists():
        return {"success": False, "message": "Source not found"}

    dst_dir = (project_path / "docs" / dest_folder).resolve() if dest_folder else docs_dir
    if not str(dst_dir).startswith(str(docs_dir)):
        return {"success": False, "message": "Invalid destination"}
    dst_dir.mkdir(parents=True, exist_ok=True)

    dst = dst_dir / src.name
    if dst.exists():
        return {"success": False, "message": f"{src.name} already exists in destination"}
    # Prevent moving a folder into itself
    if src.is_dir() and str(dst_dir).startswith(str(src)):
        return {"success": False, "message": "Cannot move folder into itself"}

    try:
        shutil.move(str(src), str(dst))
        return {"success": True, "message": f"Moved to {dest_folder or '/'}" }
    except OSError as e:
        return {"success": False, "message": f"Failed: {e}"}


def rename_doc(project_name: str, old_path: str, new_name: str) -> dict[str, Any]:
    """Rename a file or folder in a project's docs/ directory."""
    project_path = _find_project_path(project_name)
    if project_path is None:
        return {"success": False, "message": "Project not found"}

    docs_dir = (project_path / "docs").resolve()
    src = (project_path / "docs" / old_path).resolve()
    if not str(src).startswith(str(docs_dir)) or src == docs_dir:
        return {"success": False, "message": "Invalid path"}
    if not src.exists():
        return {"success": False, "message": "Not found"}

    # new_name is just the basename, no slashes allowed
    if "/" in new_name or "\\" in new_name or not new_name.strip():
        return {"success": False, "message": "Invalid name"}

    dst = src.parent / new_name.strip()
    if dst.exists():
        return {"success": False, "message": "Name already exists"}

    try:
        src.rename(dst)
        return {"success": True, "message": f"Renamed to {new_name}"}
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


def move_quicknote_to_project(
    filename: str, project_name: str, target_folder: str
) -> dict[str, Any]:
    """Move a project memo from _project_memo/ to a project's docs/ folder as a standalone file."""
    temp_path = Path(os.path.expanduser("~/Projects/_notes/_project_memo"))
    src = (temp_path / filename).resolve()
    if not str(src).startswith(str(temp_path.resolve())) or not src.is_file():
        return {"success": False, "message": "Source file not found"}

    project_path = _find_project_path(project_name)
    if project_path is None:
        return {"success": False, "message": "Project not found"}

    docs_dir = project_path / "docs"
    docs_dir.mkdir(parents=True, exist_ok=True)
    dest_dir = docs_dir / target_folder if target_folder else docs_dir

    try:
        resolved = dest_dir.resolve()
        if not str(resolved).startswith(str(docs_dir.resolve())):
            return {"success": False, "message": "Invalid target folder"}
    except (OSError, ValueError):
        return {"success": False, "message": "Invalid target folder"}

    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / filename
    if dest.exists():
        stem = filename.rsplit(".", 1)[0] if "." in filename else filename
        ext = f".{filename.rsplit('.', 1)[1]}" if "." in filename else ""
        counter = 1
        while dest.exists():
            dest = dest_dir / f"{stem}_{counter}{ext}"
            counter += 1

    try:
        import shutil
        shutil.move(str(src), str(dest))
        return {"success": True, "message": f"Moved to {project_name}/docs/{target_folder}"}
    except OSError as e:
        return {"success": False, "message": f"Failed: {e}"}


def list_doc_folders(project_name: str) -> list[str]:
    """Recursively list all subfolder paths under a project's docs/ directory in depth-first sorted order."""
    project_path = _find_project_path(project_name)
    if project_path is None:
        return []

    docs_dir = project_path / "docs"
    if not docs_dir.is_dir():
        return []

    folders: list[str] = [""]  # root = ""

    def _scan(parent: Path, prefix: str) -> None:
        try:
            children = sorted(
                [d for d in parent.iterdir() if d.is_dir() and not d.name.startswith(".")],
                key=lambda p: p.name,
            )
        except OSError:
            return
        for child in children:
            rel = f"{prefix}/{child.name}" if prefix else child.name
            folders.append(rel)
            _scan(child, rel)

    _scan(docs_dir, "")
    return folders


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
