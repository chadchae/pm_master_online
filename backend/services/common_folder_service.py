"""Service for managing common folders (_notes, _learning, _issues_common, _guideline)."""

import os
from pathlib import Path
from typing import Any

PROJECTS_ROOT = Path(os.environ.get("PROJECTS_ROOT", os.path.expanduser("~/Projects")))

# Mapping of folder types to actual directory names
FOLDER_TYPE_MAP = {
    "notes": "_notes",
    "learning": "_learning",
    "issues": "_issues_common",
    "issue-docs": "_issues_common",
    "guideline": "_guideline",
    "guidelines": "_guideline",
    "documents": "_notes",  # documents tab maps to _notes for common view
}


def _get_folder_path(folder_type: str) -> Path | None:
    """Get the path for a common folder type."""
    dir_name = FOLDER_TYPE_MAP.get(folder_type)
    if dir_name is None:
        return None
    return PROJECTS_ROOT / dir_name


def list_files_at(folder_type: str, subpath: str = "") -> list[dict[str, Any]]:
    """List direct children of a path within a common folder."""
    folder_path = _get_folder_path(folder_type)
    if folder_path is None:
        return []

    target = folder_path / subpath if subpath else folder_path

    # Security: path traversal check
    try:
        resolved = target.resolve()
        if not str(resolved).startswith(str(folder_path.resolve())):
            return []
    except (OSError, ValueError):
        return []

    if not target.is_dir():
        return []

    files: list[dict[str, Any]] = []
    try:
        for item in sorted(target.iterdir()):
            if item.name.startswith("."):
                continue
            rel = f"{subpath}/{item.name}" if subpath else item.name
            if item.is_dir():
                files.append({
                    "filename": item.name,
                    "path": rel,
                    "size": 0,
                    "last_modified": 0,
                    "is_directory": True,
                })
            elif item.is_file():
                try:
                    stat = item.stat()
                    files.append({
                        "filename": item.name,
                        "path": rel,
                        "size": stat.st_size,
                        "last_modified": stat.st_mtime,
                        "is_directory": False,
                    })
                except OSError:
                    continue
    except OSError:
        pass
    return files


def list_files(folder_type: str) -> list[dict[str, Any]]:
    """List files in a common folder."""
    folder_path = _get_folder_path(folder_type)
    if folder_path is None:
        return []

    if not folder_path.is_dir():
        return []

    files: list[dict[str, Any]] = []

    def _scan_dir(dir_path: Path, prefix: str = "") -> None:
        """Recursively scan directory for files."""
        try:
            items = sorted(dir_path.iterdir())
        except OSError:
            return

        for item in items:
            if item.name.startswith("."):
                continue

            relative_name = f"{prefix}{item.name}" if not prefix else f"{prefix}/{item.name}"

            if item.is_file():
                try:
                    stat = item.stat()
                    files.append({
                        "filename": item.name,
                        "path": relative_name if prefix else item.name,
                        "size": stat.st_size,
                        "last_modified": stat.st_mtime,
                        "is_directory": False,
                    })
                except OSError:
                    continue
            elif item.is_dir():
                files.append({
                    "filename": item.name,
                    "path": relative_name if prefix else item.name,
                    "size": 0,
                    "last_modified": 0,
                    "is_directory": True,
                })
                _scan_dir(item, relative_name if prefix else item.name)

    _scan_dir(folder_path)
    return files


def read_file(folder_type: str, filename: str) -> str | None:
    """Read a file from a common folder."""
    folder_path = _get_folder_path(folder_type)
    if folder_path is None:
        return None

    filepath = folder_path / filename
    # Security: prevent path traversal
    try:
        filepath = filepath.resolve()
        resolved_folder = folder_path.resolve()
        if not str(filepath).startswith(str(resolved_folder)):
            return None
    except (OSError, ValueError):
        return None

    if not filepath.is_file():
        return None

    try:
        return filepath.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return None


def write_file(folder_type: str, filename: str, content: str) -> dict[str, Any]:
    """Write/update a file in a common folder."""
    folder_path = _get_folder_path(folder_type)
    if folder_path is None:
        return {"success": False, "message": f"Invalid folder type: {folder_type}"}

    # Ensure the folder exists
    folder_path.mkdir(parents=True, exist_ok=True)

    filepath = folder_path / filename
    # Security: prevent path traversal
    try:
        filepath = filepath.resolve()
        resolved_folder = folder_path.resolve()
        if not str(filepath).startswith(str(resolved_folder)):
            return {"success": False, "message": "Invalid filename"}
    except (OSError, ValueError):
        return {"success": False, "message": "Invalid filename"}

    # Create parent directories if the filename includes subdirectories
    filepath.parent.mkdir(parents=True, exist_ok=True)

    try:
        filepath.write_text(content, encoding="utf-8")
        return {"success": True, "message": f"Saved {filename}"}
    except OSError as e:
        return {"success": False, "message": f"Failed to save: {e}"}


def create_subfolder(folder_type: str, subfolder_name: str) -> dict[str, Any]:
    """Create a subfolder in a common folder."""
    folder_path = _get_folder_path(folder_type)
    if folder_path is None:
        return {"success": False, "message": f"Invalid folder type: {folder_type}"}

    target = folder_path / subfolder_name
    try:
        resolved = target.resolve()
        if not str(resolved).startswith(str(folder_path.resolve())):
            return {"success": False, "message": "Invalid folder name"}
    except (OSError, ValueError):
        return {"success": False, "message": "Invalid folder name"}

    if target.exists():
        return {"success": False, "message": "Folder already exists"}

    try:
        target.mkdir(parents=True, exist_ok=True)
        return {"success": True, "message": f"Created {subfolder_name}"}
    except OSError as e:
        return {"success": False, "message": f"Failed: {e}"}


def delete_subfolder(folder_type: str, subfolder_name: str) -> dict[str, Any]:
    """Delete a subfolder from a common folder."""
    import shutil
    folder_path = _get_folder_path(folder_type)
    if folder_path is None:
        return {"success": False, "message": f"Invalid folder type: {folder_type}"}

    target = folder_path / subfolder_name
    try:
        resolved = target.resolve()
        base = folder_path.resolve()
        if not str(resolved).startswith(str(base)) or resolved == base:
            return {"success": False, "message": "Invalid folder name"}
    except (OSError, ValueError):
        return {"success": False, "message": "Invalid folder name"}

    if not target.is_dir():
        return {"success": False, "message": "Folder not found"}

    try:
        shutil.rmtree(str(target))
        return {"success": True, "message": f"Deleted {subfolder_name}"}
    except OSError as e:
        return {"success": False, "message": f"Failed: {e}"}


def delete_file(folder_type: str, filename: str) -> dict[str, Any]:
    """Delete a file from a common folder."""
    folder_path = _get_folder_path(folder_type)
    if folder_path is None:
        return {"success": False, "message": f"Invalid folder type: {folder_type}"}

    filepath = folder_path / filename
    # Security: prevent path traversal
    try:
        filepath = filepath.resolve()
        resolved_folder = folder_path.resolve()
        if not str(filepath).startswith(str(resolved_folder)):
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


def list_quicknotes() -> list[dict[str, Any]]:
    """List quick notes from _notes/_temp/."""
    temp_path = PROJECTS_ROOT / "_notes" / "_temp"
    if not temp_path.is_dir():
        temp_path.mkdir(parents=True, exist_ok=True)
        return []

    notes: list[dict[str, Any]] = []
    try:
        for item in sorted(temp_path.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True):
            if item.is_file() and not item.name.startswith("."):
                stat = item.stat()
                notes.append({
                    "filename": item.name,
                    "size": stat.st_size,
                    "last_modified": stat.st_mtime,
                })
    except OSError:
        pass
    return notes


def create_quicknote(title: str, content: str) -> dict[str, Any]:
    """Create a new quick note in _notes/_temp/."""
    temp_path = PROJECTS_ROOT / "_notes" / "_temp"
    temp_path.mkdir(parents=True, exist_ok=True)

    # Sanitize title for filename
    safe_title = "".join(c for c in title if c.isalnum() or c in "-_ ").strip()
    if not safe_title:
        safe_title = "untitled"
    filename = f"{safe_title}.md"

    filepath = temp_path / filename
    # Avoid overwriting
    counter = 1
    while filepath.exists():
        filename = f"{safe_title}_{counter}.md"
        filepath = temp_path / filename
        counter += 1

    try:
        filepath.write_text(content, encoding="utf-8")
        return {"success": True, "filename": filename, "message": f"Created {filename}"}
    except OSError as e:
        return {"success": False, "message": f"Failed to create: {e}"}


def read_quicknote(filename: str) -> dict[str, Any]:
    """Read a quick note's content from _notes/_temp/."""
    temp_path = PROJECTS_ROOT / "_notes" / "_temp"
    filepath = (temp_path / filename).resolve()
    if not str(filepath).startswith(str(temp_path.resolve())) or not filepath.is_file():
        return {"success": False, "message": "File not found"}
    try:
        content = filepath.read_text(encoding="utf-8")
        return {"success": True, "filename": filename, "content": content}
    except OSError as e:
        return {"success": False, "message": f"Failed to read: {e}"}


def update_quicknote(filename: str, content: str) -> dict[str, Any]:
    """Update a quick note's content in _notes/_temp/."""
    temp_path = PROJECTS_ROOT / "_notes" / "_temp"
    filepath = (temp_path / filename).resolve()
    if not str(filepath).startswith(str(temp_path.resolve())) or not filepath.is_file():
        return {"success": False, "message": "File not found"}
    try:
        filepath.write_text(content, encoding="utf-8")
        return {"success": True, "filename": filename, "message": "Updated"}
    except OSError as e:
        return {"success": False, "message": f"Failed to update: {e}"}


def delete_quicknote(filename: str) -> dict[str, Any]:
    """Delete a quick note from _notes/_temp/."""
    temp_path = PROJECTS_ROOT / "_notes" / "_temp"
    filepath = (temp_path / filename).resolve()
    resolved_temp = temp_path.resolve()

    if not str(filepath).startswith(str(resolved_temp)):
        return {"success": False, "message": "Invalid filename"}

    if not filepath.is_file():
        return {"success": False, "message": "File not found"}

    try:
        filepath.unlink()
        return {"success": True, "message": f"Deleted {filename}"}
    except OSError as e:
        return {"success": False, "message": f"Failed to delete: {e}"}


# --- Project Memo (separate from quick notes, stored in _notes/_project_memo/) ---

_PROJECT_MEMO_DIR = PROJECTS_ROOT / "_notes" / "_project_memo"


def list_project_memos() -> list[dict[str, Any]]:
    """List project memos from _notes/_project_memo/."""
    _PROJECT_MEMO_DIR.mkdir(parents=True, exist_ok=True)
    memos: list[dict[str, Any]] = []
    try:
        for item in sorted(_PROJECT_MEMO_DIR.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True):
            if item.is_file() and not item.name.startswith("."):
                stat = item.stat()
                memos.append({
                    "filename": item.name,
                    "size": stat.st_size,
                    "last_modified": stat.st_mtime,
                })
    except OSError:
        pass
    return memos


def create_project_memo(title: str, content: str) -> dict[str, Any]:
    """Create a new project memo in _notes/_project_memo/."""
    _PROJECT_MEMO_DIR.mkdir(parents=True, exist_ok=True)
    safe_title = "".join(c for c in title if c.isalnum() or c in "-_ ").strip() or "untitled"
    filename = f"{safe_title}.md"
    filepath = _PROJECT_MEMO_DIR / filename
    counter = 1
    while filepath.exists():
        filename = f"{safe_title}_{counter}.md"
        filepath = _PROJECT_MEMO_DIR / filename
        counter += 1
    try:
        filepath.write_text(content, encoding="utf-8")
        return {"success": True, "filename": filename, "message": f"Created {filename}"}
    except OSError as e:
        return {"success": False, "message": f"Failed to create: {e}"}


def read_project_memo(filename: str) -> dict[str, Any]:
    """Read a project memo's content."""
    filepath = (_PROJECT_MEMO_DIR / filename).resolve()
    if not str(filepath).startswith(str(_PROJECT_MEMO_DIR.resolve())) or not filepath.is_file():
        return {"success": False, "message": "File not found"}
    try:
        return {"success": True, "filename": filename, "content": filepath.read_text(encoding="utf-8")}
    except OSError as e:
        return {"success": False, "message": f"Failed to read: {e}"}


def update_project_memo(filename: str, content: str) -> dict[str, Any]:
    """Update a project memo's content."""
    filepath = (_PROJECT_MEMO_DIR / filename).resolve()
    if not str(filepath).startswith(str(_PROJECT_MEMO_DIR.resolve())) or not filepath.is_file():
        return {"success": False, "message": "File not found"}
    try:
        filepath.write_text(content, encoding="utf-8")
        return {"success": True, "filename": filename, "message": "Updated"}
    except OSError as e:
        return {"success": False, "message": f"Failed to update: {e}"}


def delete_project_memo(filename: str) -> dict[str, Any]:
    """Delete a project memo."""
    filepath = (_PROJECT_MEMO_DIR / filename).resolve()
    if not str(filepath).startswith(str(_PROJECT_MEMO_DIR.resolve())) or not filepath.is_file():
        return {"success": False, "message": "File not found"}
    try:
        filepath.unlink()
        return {"success": True, "message": f"Deleted {filename}"}
    except OSError as e:
        return {"success": False, "message": f"Failed to delete: {e}"}


def move_quicknote(filename: str, target_file: str) -> dict[str, Any]:
    """Move a quick note from _temp/ to a target file in _notes/ (append)."""
    temp_path = PROJECTS_ROOT / "_notes" / "_temp"
    notes_path = PROJECTS_ROOT / "_notes"

    src = (temp_path / filename).resolve()
    if not str(src).startswith(str(temp_path.resolve())) or not src.is_file():
        return {"success": False, "message": "Source file not found"}

    dst = (notes_path / target_file).resolve()
    if not str(dst).startswith(str(notes_path.resolve())):
        return {"success": False, "message": "Invalid target file"}

    try:
        note_content = src.read_text(encoding="utf-8")
        # Append to target with date separator
        from datetime import datetime
        date_str = datetime.now().strftime("%Y-%m-%d %H:%M")
        append_text = f"\n\n---\n\n### {date_str}\n\n{note_content}"

        if dst.is_file():
            existing = dst.read_text(encoding="utf-8")
            dst.write_text(existing + append_text, encoding="utf-8")
        else:
            dst.write_text(f"# {target_file}\n{append_text}", encoding="utf-8")

        src.unlink()
        return {"success": True, "message": f"Moved to {target_file}"}
    except OSError as e:
        return {"success": False, "message": f"Failed: {e}"}
