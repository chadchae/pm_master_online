"""Project log service with per-project JSON file storage."""

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).parent.parent / "data" / "logs"


def _get_data_file(project_name: str) -> Path:
    """Get the JSON file path for a project's logs."""
    return DATA_DIR / f"{project_name}.json"


def _load_logs(project_name: str) -> dict[str, Any]:
    """Load logs for a project, creating default if not exists."""
    data_file = _get_data_file(project_name)
    if not data_file.exists():
        return {"entries": []}
    try:
        with open(data_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        if "entries" not in data:
            data["entries"] = []
        return data
    except (json.JSONDecodeError, OSError):
        return {"entries": []}


def _save_logs(project_name: str, data: dict[str, Any]) -> None:
    """Save log data to the project's JSON file."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    data_file = _get_data_file(project_name)
    with open(data_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def list_logs(project_name: str) -> dict[str, Any]:
    """List all log entries for a project, sorted by created_at descending."""
    data = _load_logs(project_name)
    data["entries"].sort(key=lambda e: e.get("created_at", ""), reverse=True)
    return data


def create_log(project_name: str, entry_data: dict[str, Any]) -> dict[str, Any]:
    """Create a new log entry for a project."""
    data = _load_logs(project_name)
    entry = {
        "id": str(uuid.uuid4()),
        "type": entry_data.get("type", "note"),
        "title": entry_data.get("title", ""),
        "description": entry_data.get("description", ""),
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "tags": entry_data.get("tags", []),
    }
    data["entries"].append(entry)
    _save_logs(project_name, data)
    return entry


def auto_log(project_name: str, log_type: str, title: str, description: str = "") -> None:
    """Create an automatic log entry (fire-and-forget, never raises)."""
    try:
        create_log(project_name, {
            "type": log_type,
            "title": title,
            "description": description,
            "tags": ["auto"],
        })
    except Exception:
        pass


def delete_log(project_name: str, log_id: str) -> bool:
    """Delete a log entry by ID. Returns True if found and deleted."""
    data = _load_logs(project_name)
    original_len = len(data["entries"])
    data["entries"] = [e for e in data["entries"] if e.get("id") != log_id]
    if len(data["entries"]) == original_len:
        return False
    _save_logs(project_name, data)
    return True
