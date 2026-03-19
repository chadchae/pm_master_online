"""Issue management service with per-project JSON file storage."""

import json
import uuid
from datetime import date, datetime
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).parent.parent / "data" / "issues"


def _get_data_file(project_name: str) -> Path:
    """Get the JSON file path for a project's issues."""
    return DATA_DIR / f"{project_name}.json"


def _load_issues(project_name: str) -> dict[str, Any]:
    """Load issues for a project, creating default if not exists."""
    data_file = _get_data_file(project_name)
    if not data_file.exists():
        return {"issues": []}
    try:
        with open(data_file, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {"issues": []}


def _save_issues(project_name: str, data: dict[str, Any]) -> None:
    """Save issues data to the project's JSON file."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    data_file = _get_data_file(project_name)
    with open(data_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def list_issues(project_name: str) -> dict[str, Any]:
    """Return all issues for a project."""
    return _load_issues(project_name)


def create_issue(project_name: str, issue_data: dict[str, Any]) -> dict[str, Any]:
    """Create a new issue."""
    data = _load_issues(project_name)
    today = str(date.today())

    new_issue: dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "title": issue_data.get("title", ""),
        "description": issue_data.get("description", ""),
        "status": issue_data.get("status", "open"),
        "priority": issue_data.get("priority", "medium"),
        "labels": issue_data.get("labels", []),
        "assignee": issue_data.get("assignee", ""),
        "created_at": today,
        "updated_at": today,
        "resolved_at": "",
        "comments": [],
    }

    data["issues"].append(new_issue)
    _save_issues(project_name, data)
    return new_issue


def update_issue(
    project_name: str, issue_id: str, updates: dict[str, Any]
) -> dict[str, Any] | None:
    """Update fields of an existing issue."""
    data = _load_issues(project_name)
    for issue in data["issues"]:
        if issue["id"] == issue_id:
            for key in (
                "title", "description", "status", "priority",
                "labels", "assignee",
            ):
                if key in updates:
                    issue[key] = updates[key]
            issue["updated_at"] = str(date.today())
            _save_issues(project_name, data)
            return issue
    return None


def delete_issue(project_name: str, issue_id: str) -> bool:
    """Delete an issue. Returns True if found and deleted."""
    data = _load_issues(project_name)
    original_len = len(data["issues"])
    data["issues"] = [i for i in data["issues"] if i["id"] != issue_id]
    if len(data["issues"]) < original_len:
        _save_issues(project_name, data)
        return True
    return False


def add_comment(
    project_name: str, issue_id: str, author: str, content: str
) -> dict[str, Any] | None:
    """Add a comment to an issue. Returns the updated issue or None."""
    data = _load_issues(project_name)
    for issue in data["issues"]:
        if issue["id"] == issue_id:
            now = datetime.now().strftime("%Y-%m-%d %H:%M")
            comment: dict[str, Any] = {
                "id": str(uuid.uuid4()),
                "author": author,
                "content": content,
                "created_at": now,
            }
            issue["comments"].append(comment)
            issue["updated_at"] = str(date.today())
            _save_issues(project_name, data)
            return issue
    return None


def update_comment(
    project_name: str, issue_id: str, comment_id: str, content: str
) -> dict[str, Any] | None:
    """Update a comment's content."""
    data = _load_issues(project_name)
    for issue in data["issues"]:
        if issue["id"] == issue_id:
            for comment in issue["comments"]:
                if comment["id"] == comment_id:
                    comment["content"] = content
                    comment["edited_at"] = datetime.now().strftime("%Y-%m-%d %H:%M")
                    issue["updated_at"] = str(date.today())
                    _save_issues(project_name, data)
                    return issue
    return None


def delete_comment(
    project_name: str, issue_id: str, comment_id: str
) -> dict[str, Any] | None:
    """Delete a comment from an issue."""
    data = _load_issues(project_name)
    for issue in data["issues"]:
        if issue["id"] == issue_id:
            original = len(issue["comments"])
            issue["comments"] = [c for c in issue["comments"] if c["id"] != comment_id]
            if len(issue["comments"]) < original:
                issue["updated_at"] = str(date.today())
                _save_issues(project_name, data)
                return issue
    return None


def resolve_issue(project_name: str, issue_id: str) -> dict[str, Any] | None:
    """Set issue status to resolved and record resolved_at timestamp."""
    data = _load_issues(project_name)
    for issue in data["issues"]:
        if issue["id"] == issue_id:
            issue["status"] = "resolved"
            issue["resolved_at"] = str(date.today())
            issue["updated_at"] = str(date.today())
            _save_issues(project_name, data)
            return issue
    return None
