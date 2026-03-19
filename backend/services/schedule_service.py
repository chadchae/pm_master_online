"""Schedule management service with per-project JSON file storage."""

import json
import uuid
from datetime import date, datetime
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).parent.parent / "data" / "schedules"


def _get_data_file(project_name: str) -> Path:
    """Get the JSON file path for a project's schedule."""
    return DATA_DIR / f"{project_name}.json"


def _load_schedule(project_name: str) -> dict[str, Any]:
    """Load schedule for a project, creating default if not exists."""
    data_file = _get_data_file(project_name)
    if not data_file.exists():
        return {"tasks": [], "milestones": []}
    try:
        with open(data_file, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {"tasks": [], "milestones": []}


def _save_schedule(project_name: str, data: dict[str, Any]) -> None:
    """Save schedule data to the project's JSON file."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    data_file = _get_data_file(project_name)
    with open(data_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _calc_duration(start_date: str, end_date: str) -> int:
    """Calculate duration in days between two date strings."""
    try:
        s = datetime.strptime(start_date, "%Y-%m-%d").date()
        e = datetime.strptime(end_date, "%Y-%m-%d").date()
        return max((e - s).days, 0)
    except (ValueError, TypeError):
        return 0


def _auto_detect_overdue(tasks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Auto-detect overdue tasks: if end_date < today and status != done."""
    today = str(date.today())
    for task in tasks:
        if task.get("end_date") and task["end_date"] < today and task.get("status") != "done":
            task["status"] = "overdue"
    return tasks


def list_schedule(project_name: str) -> dict[str, Any]:
    """Return full schedule data with overdue detection."""
    data = _load_schedule(project_name)
    data["tasks"] = _auto_detect_overdue(data.get("tasks", []))
    return data


def create_task(project_name: str, task_data: dict[str, Any]) -> dict[str, Any]:
    """Create a new schedule task."""
    data = _load_schedule(project_name)
    tasks = data.get("tasks", [])

    start_date = task_data.get("start_date", str(date.today()))
    end_date = task_data.get("end_date", start_date)
    duration = _calc_duration(start_date, end_date)

    # Calculate order: append at end
    max_order = max((t.get("order", 0) for t in tasks), default=-1)

    task: dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "title": task_data.get("title", ""),
        "description": task_data.get("description", ""),
        "start_date": start_date,
        "end_date": end_date,
        "duration_days": duration,
        "assignee": task_data.get("assignee", ""),
        "status": task_data.get("status", "planned"),
        "depends_on": task_data.get("depends_on", []),
        "parent_id": task_data.get("parent_id", ""),
        "progress_pct": task_data.get("progress_pct", 0),
        "order": max_order + 1,
    }

    tasks.append(task)
    data["tasks"] = tasks
    _save_schedule(project_name, data)
    return task


def update_task(
    project_name: str, task_id: str, updates: dict[str, Any]
) -> dict[str, Any] | None:
    """Update a schedule task's fields, auto-recalc duration."""
    data = _load_schedule(project_name)
    tasks = data.get("tasks", [])

    for task in tasks:
        if task["id"] == task_id:
            for key, val in updates.items():
                if key != "id":
                    task[key] = val
            # Recalculate duration if dates changed
            if "start_date" in updates or "end_date" in updates:
                task["duration_days"] = _calc_duration(
                    task.get("start_date", ""),
                    task.get("end_date", ""),
                )
            data["tasks"] = tasks
            _save_schedule(project_name, data)
            return task

    return None


def delete_task(project_name: str, task_id: str) -> bool:
    """Delete a schedule task."""
    data = _load_schedule(project_name)
    tasks = data.get("tasks", [])
    original_len = len(tasks)
    data["tasks"] = [t for t in tasks if t["id"] != task_id]

    if len(data["tasks"]) < original_len:
        _save_schedule(project_name, data)
        return True
    return False


def reorder_tasks(project_name: str, ordered_ids: list[str]) -> dict[str, Any]:
    """Reorder tasks based on ID list."""
    data = _load_schedule(project_name)
    tasks = data.get("tasks", [])
    task_map = {t["id"]: t for t in tasks}

    reordered: list[dict[str, Any]] = []
    for i, tid in enumerate(ordered_ids):
        if tid in task_map:
            task_map[tid]["order"] = i
            reordered.append(task_map[tid])

    # Append any tasks not in ordered_ids
    for t in tasks:
        if t["id"] not in {r["id"] for r in reordered}:
            t["order"] = len(reordered)
            reordered.append(t)

    data["tasks"] = reordered
    _save_schedule(project_name, data)
    return data


def create_milestone(
    project_name: str, ms_data: dict[str, Any]
) -> dict[str, Any]:
    """Create a new milestone."""
    data = _load_schedule(project_name)
    milestones = data.get("milestones", [])

    milestone: dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "title": ms_data.get("title", ""),
        "date": ms_data.get("date", str(date.today())),
        "description": ms_data.get("description", ""),
        "linked_tasks": ms_data.get("linked_tasks", []),
        "status": ms_data.get("status", "upcoming"),
    }

    milestones.append(milestone)
    data["milestones"] = milestones
    _save_schedule(project_name, data)
    return milestone


def update_milestone(
    project_name: str, ms_id: str, updates: dict[str, Any]
) -> dict[str, Any] | None:
    """Update a milestone."""
    data = _load_schedule(project_name)
    milestones = data.get("milestones", [])

    for ms in milestones:
        if ms["id"] == ms_id:
            for key, val in updates.items():
                if key != "id":
                    ms[key] = val
            data["milestones"] = milestones
            _save_schedule(project_name, data)
            return ms

    return None


def delete_milestone(project_name: str, ms_id: str) -> bool:
    """Delete a milestone."""
    data = _load_schedule(project_name)
    milestones = data.get("milestones", [])
    original_len = len(milestones)
    data["milestones"] = [m for m in milestones if m["id"] != ms_id]

    if len(data["milestones"]) < original_len:
        _save_schedule(project_name, data)
        return True
    return False


def get_summary(project_name: str) -> dict[str, Any]:
    """Return schedule summary for project header widget."""
    data = _load_schedule(project_name)
    tasks = _auto_detect_overdue(data.get("tasks", []))
    milestones = data.get("milestones", [])

    today_str = str(date.today())
    upcoming_milestones = [
        m for m in milestones
        if m.get("date", "") >= today_str and m.get("status") != "reached"
    ]

    total = len(tasks)
    planned = len([t for t in tasks if t.get("status") == "planned"])
    in_progress = len([t for t in tasks if t.get("status") == "in_progress"])
    done = len([t for t in tasks if t.get("status") == "done"])
    overdue = len([t for t in tasks if t.get("status") == "overdue"])

    return {
        "total": total,
        "planned": planned,
        "in_progress": in_progress,
        "done": done,
        "overdue": overdue,
        "upcoming_milestones": len(upcoming_milestones),
    }
