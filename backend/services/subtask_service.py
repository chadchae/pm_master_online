"""Subtask management service with per-project JSON file storage."""

import json
import uuid
from datetime import date
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).parent.parent / "data" / "subtasks"


def _get_data_file(project_name: str) -> Path:
    """Get the JSON file path for a project's subtasks."""
    return DATA_DIR / f"{project_name}.json"


def _load_subtasks(project_name: str) -> dict[str, Any]:
    """Load subtasks for a project, creating default if not exists."""
    data_file = _get_data_file(project_name)
    if not data_file.exists():
        return {"subtasks": []}
    try:
        with open(data_file, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {"subtasks": []}


def _save_subtasks(project_name: str, data: dict[str, Any]) -> None:
    """Save subtasks data to the project's JSON file."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    data_file = _get_data_file(project_name)
    with open(data_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def list_subtasks(project_name: str) -> dict[str, Any]:
    """Return all subtasks for a project, sorted by order."""
    data = _load_subtasks(project_name)
    data["subtasks"] = sorted(data["subtasks"], key=lambda x: x.get("order", 0))
    return data


def create_subtask(
    project_name: str, title: str, description: str = ""
) -> dict[str, Any]:
    """Create a new subtask, appended at end."""
    data = _load_subtasks(project_name)
    max_order = max((s.get("order", 0) for s in data["subtasks"]), default=-1)

    new_subtask = {
        "id": str(uuid.uuid4()),
        "title": title,
        "description": description,
        "status": "pending",
        "order": max_order + 1,
        "created_at": str(date.today()),
        "completed_at": "",
    }

    data["subtasks"].append(new_subtask)
    _save_subtasks(project_name, data)
    return new_subtask


def update_subtask(
    project_name: str, subtask_id: str, updates: dict[str, Any]
) -> dict[str, Any] | None:
    """Update title/description of a subtask."""
    data = _load_subtasks(project_name)
    for item in data["subtasks"]:
        if item["id"] == subtask_id:
            if "title" in updates:
                item["title"] = updates["title"]
            if "description" in updates:
                item["description"] = updates["description"]
            _save_subtasks(project_name, data)
            return item
    return None


def delete_subtask(project_name: str, subtask_id: str) -> bool:
    """Delete a subtask. Returns True if found and deleted."""
    data = _load_subtasks(project_name)
    original_len = len(data["subtasks"])
    data["subtasks"] = [s for s in data["subtasks"] if s["id"] != subtask_id]
    if len(data["subtasks"]) < original_len:
        # Recompute order after deletion
        for idx, item in enumerate(
            sorted(data["subtasks"], key=lambda x: x.get("order", 0))
        ):
            item["order"] = idx
        _save_subtasks(project_name, data)
        return True
    return False


def toggle_subtask(
    project_name: str, subtask_id: str, status: str
) -> dict[str, Any] | None:
    """Toggle subtask status to pending, done, or cancelled."""
    if status not in ("pending", "done", "cancelled"):
        return None

    data = _load_subtasks(project_name)
    for item in data["subtasks"]:
        if item["id"] == subtask_id:
            item["status"] = status
            if status in ("done", "cancelled"):
                item["completed_at"] = str(date.today())
            else:
                item["completed_at"] = ""
            _save_subtasks(project_name, data)
            return item
    return None


def reorder_subtasks(
    project_name: str, ordered_ids: list[str]
) -> dict[str, Any]:
    """Reorder subtasks based on the provided ID list."""
    data = _load_subtasks(project_name)
    id_to_item = {s["id"]: s for s in data["subtasks"]}

    reordered = []
    for idx, sid in enumerate(ordered_ids):
        if sid in id_to_item:
            item = id_to_item.pop(sid)
            item["order"] = idx
            reordered.append(item)

    # Append any remaining items not in the ordered_ids list
    for item in id_to_item.values():
        item["order"] = len(reordered)
        reordered.append(item)

    data["subtasks"] = reordered
    _save_subtasks(project_name, data)
    return data


def get_counts(project_name: str) -> dict[str, int]:
    """Return subtask counts: total, done, cancelled, pending."""
    data = _load_subtasks(project_name)
    subtasks = data["subtasks"]
    total = len(subtasks)
    done = len([s for s in subtasks if s["status"] == "done"])
    cancelled = len([s for s in subtasks if s["status"] == "cancelled"])
    pending = len([s for s in subtasks if s["status"] == "pending"])
    return {
        "total": total,
        "done": done,
        "cancelled": cancelled,
        "pending": pending,
    }
