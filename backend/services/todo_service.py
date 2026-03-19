"""Todo management service with per-project JSON file storage."""

import json
import uuid
from datetime import date
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).parent.parent / "data" / "todos"

DEFAULT_COLUMNS = ["todo", "in_progress", "done"]


def _get_data_file(project_name: str) -> Path:
    """Get the JSON file path for a project's todos."""
    return DATA_DIR / f"{project_name}.json"


def _load_todos(project_name: str) -> dict[str, Any]:
    """Load todos for a project, creating default if not exists."""
    data_file = _get_data_file(project_name)
    if not data_file.exists():
        return {"columns": list(DEFAULT_COLUMNS), "items": []}
    try:
        with open(data_file, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {"columns": list(DEFAULT_COLUMNS), "items": []}


def _save_todos(project_name: str, data: dict[str, Any]) -> None:
    """Save todos data to the project's JSON file."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    data_file = _get_data_file(project_name)
    with open(data_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def list_todos(project_name: str) -> dict[str, Any]:
    """Return all todos for a project."""
    return _load_todos(project_name)


def create_todo(project_name: str, todo_data: dict[str, Any]) -> dict[str, Any]:
    """Create a new todo item."""
    data = _load_todos(project_name)
    column = todo_data.get("column", "todo")
    today = str(date.today())

    # Calculate order: append at end of column
    column_items = [i for i in data["items"] if i["column"] == column]
    max_order = max((i["order"] for i in column_items), default=-1)

    new_todo = {
        "id": str(uuid.uuid4()),
        "title": todo_data.get("title", ""),
        "description": todo_data.get("description", ""),
        "column": column,
        "priority": todo_data.get("priority", "medium"),
        "assignee": todo_data.get("assignee", ""),
        "due_date": todo_data.get("due_date", ""),
        "created_at": today,
        "updated_at": today,
        "completed_at": "",
        "order": max_order + 1,
    }

    data["items"].append(new_todo)
    _save_todos(project_name, data)
    return new_todo


def update_todo(
    project_name: str, todo_id: str, updates: dict[str, Any]
) -> dict[str, Any] | None:
    """Update fields of an existing todo item."""
    data = _load_todos(project_name)
    for item in data["items"]:
        if item["id"] == todo_id:
            for key in ("title", "description", "priority", "assignee", "due_date", "completed_at"):
                if key in updates:
                    item[key] = updates[key]
            item["updated_at"] = str(date.today())
            _save_todos(project_name, data)
            return item
    return None


def delete_todo(project_name: str, todo_id: str) -> bool:
    """Delete a todo item. Returns True if found and deleted."""
    data = _load_todos(project_name)
    original_len = len(data["items"])
    data["items"] = [i for i in data["items"] if i["id"] != todo_id]
    if len(data["items"]) < original_len:
        _save_todos(project_name, data)
        return True
    return False


def move_todo(
    project_name: str, todo_id: str, column: str, order: int
) -> dict[str, Any] | None:
    """Move a todo to a column at a specific position."""
    data = _load_todos(project_name)

    # Find the target item
    target = None
    for item in data["items"]:
        if item["id"] == todo_id:
            target = item
            break
    if target is None:
        return None

    old_column = target["column"]

    # Update the target item
    target["column"] = column
    target["order"] = order
    target["updated_at"] = str(date.today())
    # Auto-set completed_at when moving to done
    if column == "done" and not target.get("completed_at"):
        target["completed_at"] = str(date.today())
    elif column != "done":
        target["completed_at"] = ""

    # Re-order items in the destination column
    dest_items = sorted(
        [i for i in data["items"] if i["column"] == column and i["id"] != todo_id],
        key=lambda x: x["order"],
    )
    # Insert at the specified position
    dest_items.insert(order, target)
    for idx, item in enumerate(dest_items):
        item["order"] = idx

    # Re-order items in the source column if different
    if old_column != column:
        src_items = sorted(
            [i for i in data["items"] if i["column"] == old_column],
            key=lambda x: x["order"],
        )
        for idx, item in enumerate(src_items):
            item["order"] = idx

    _save_todos(project_name, data)
    return target
