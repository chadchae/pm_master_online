"""Project meta snapshot service.

Auto-generates docs/_settings/_project_meta.md for each project,
containing a consolidated snapshot of all server-side data.
"""

import os
from datetime import datetime
from pathlib import Path
from typing import Any

from services import (
    issue_service,
    scanner_service,
    schedule_service,
    subtask_service,
    todo_service,
)
from services.scanner_service import (
    COMMON_FOLDERS,
    PROJECTS_ROOT,
    STAGE_FOLDERS,
    _find_project_path,
    _read_project_yaml,
)

PEOPLE_ROOT = Path(os.path.expanduser("~/Projects/_people"))


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------


def _recursive_doc_tree(docs_path: Path, prefix: str = "") -> list[str]:
    """Recursively scan docs/ and return tree lines.

    Skips dotfiles (e.g. .DS_Store) and the _settings/ directory itself.
    """
    lines: list[str] = []
    if not docs_path.is_dir():
        return lines

    entries = sorted(
        [e for e in docs_path.iterdir() if not e.name.startswith(".")],
        key=lambda p: (not p.is_dir(), p.name),
    )
    # Also skip _settings/ to avoid self-reference
    entries = [e for e in entries if not (e.is_dir() and e.name == "_settings")]

    for idx, entry in enumerate(entries):
        is_last = idx == len(entries) - 1
        connector = "\u2514\u2500\u2500 " if is_last else "\u251c\u2500\u2500 "
        if entry.is_dir():
            lines.append(f"{prefix}{connector}{entry.name}/")
            extension = "    " if is_last else "\u2502   "
            lines.extend(
                _recursive_doc_tree(entry, prefix + extension)
            )
        else:
            lines.append(f"{prefix}{connector}{entry.name}")

    return lines


def _format_date_short(date_str: str) -> str:
    """Format YYYY-MM-DD to MM/DD."""
    if not date_str:
        return ""
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        return dt.strftime("%m/%d")
    except (ValueError, TypeError):
        return date_str


def _strike(text: str) -> str:
    """Wrap text in markdown strikethrough."""
    return f"~~{text}~~"


def _importance_stars(value: Any) -> str:
    """Convert importance value to stars."""
    if value is None or value == "":
        return ""
    try:
        n = int(value)
        return "\u2605" * n
    except (ValueError, TypeError):
        return str(value)


# ------------------------------------------------------------------
# Main functions
# ------------------------------------------------------------------


def generate_meta(project_name: str) -> dict[str, Any]:
    """Generate _project_meta.md for a single project.

    Returns a dict with success status and details.
    """
    # a. Find project path
    project_path = _find_project_path(project_name)
    if project_path is None:
        return {"success": False, "message": f"Project not found: {project_name}"}

    # b. Read metadata
    metadata = _read_project_yaml(project_path)

    # c. Determine stage
    stage = project_path.parent.name

    # d. Last modified
    try:
        mtime = project_path.stat().st_mtime
        last_modified = datetime.fromtimestamp(mtime).strftime("%Y-%m-%d %H:%M")
    except OSError:
        last_modified = ""

    # e. Scan documents
    docs_path = project_path / "docs"
    doc_tree_lines: list[str] = []
    if docs_path.is_dir():
        doc_tree_lines = ["docs/"] + _recursive_doc_tree(docs_path)

    # f. README existence
    has_readme = (project_path / "README.md").is_file()

    # g. Load todos
    try:
        todo_data = todo_service.list_todos(project_name)
        todo_items = todo_data.get("items", [])
    except Exception:
        todo_items = []

    # h. Load issues
    try:
        issue_data = issue_service.list_issues(project_name)
        issue_items = issue_data.get("issues", [])
    except Exception:
        issue_items = []

    # i. Load schedule
    try:
        schedule_data = schedule_service.list_schedule(project_name)
        schedule_tasks = schedule_data.get("tasks", [])
        schedule_milestones = schedule_data.get("milestones", [])
    except Exception:
        schedule_tasks = []
        schedule_milestones = []

    # j. Load subtasks (handle missing gracefully)
    try:
        subtask_data = subtask_service.list_subtasks(project_name)
        subtask_items = subtask_data.get("subtasks", [])
    except Exception:
        subtask_items = []

    # k. Resolve related_people
    related_people = metadata.get("related_people", [])
    if isinstance(related_people, str):
        related_people = [p.strip() for p in related_people.split(",") if p.strip()]
    people_rows: list[dict[str, str]] = []
    for name in related_people:
        name = name.strip()
        if not name:
            continue
        people_file = PEOPLE_ROOT / f"{name}.md"
        if people_file.is_file():
            people_rows.append({
                "name": name,
                "file": f"~/Projects/_people/{name}.md",
            })
        else:
            people_rows.append({
                "name": name,
                "file": "(\ubbf8\ub4f1\ub85d)",
            })

    # l. Build markdown content
    now = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    label = metadata.get("label", project_name)

    lines: list[str] = []
    lines.append("---")
    lines.append("# Auto-generated by PM Master \u2014 DO NOT EDIT MANUALLY")
    lines.append(f'generated_at: "{now}"')
    lines.append(f"project_name: {project_name}")
    lines.append("---")
    lines.append("")
    lines.append(f"# {label}")
    lines.append("")

    # -- Overview table --
    lines.append("## Overview")
    lines.append("")
    lines.append("| \ud56d\ubaa9 | \uac12 |")
    lines.append("|------|-----|")
    lines.append(f"| \uacbd\ub85c | ~/Projects/{stage}/{project_name} |")
    lines.append(f"| \ub2e8\uacc4 | {stage} |")

    field_map = [
        ("유형", "유형"),
        ("작성일", "생성일"),
        ("목표종료일", "목표종료일"),
        ("실제종료일", "실제종료일"),
    ]
    for key, display in field_map:
        val = metadata.get(key, "")
        if val:
            lines.append(f"| {display} | {val} |")

    # Importance as stars
    importance = metadata.get("중요도", "")
    if importance:
        lines.append(f"| 중요도 | {_importance_stars(importance)} |")

    simple_fields = [
        ("긴급도", "긴급도"),
        ("위급도", "위급도"),
        ("협업", "협업"),
        ("주도", "주도"),
        ("오너", "오너"),
        ("포트", "포트"),
    ]
    for key, display in simple_fields:
        val = metadata.get(key, "")
        if val:
            lines.append(f"| {display} | {val} |")

    lines.append("")

    # -- People --
    if people_rows:
        lines.append("## People")
        lines.append("")
        lines.append("| \uc774\ub984 | \ud30c\uc77c |")
        lines.append("|------|------|")
        for p in people_rows:
            lines.append(f"| {p['name']} | {p['file']} |")
        lines.append("")

    # -- Documents --
    lines.append("## Documents")
    lines.append("")
    if doc_tree_lines:
        lines.append("```")
        for tl in doc_tree_lines:
            lines.append(tl)
        lines.append("```")
    else:
        lines.append("(\uc5c6\uc74c)")
    lines.append("")
    lines.append(f"README: {'\uc788\uc74c' if has_readme else '\uc5c6\uc74c'}")
    lines.append("")

    # -- Todos --
    lines.append(f"## Todo ({len(todo_items)})")
    lines.append("")
    if todo_items:
        col_counts: dict[str, int] = {}
        for t in todo_items:
            col = t.get("column", "todo")
            col_counts[col] = col_counts.get(col, 0) + 1
        done_count = col_counts.get("done", 0)
        total = len(todo_items)
        progress = round(done_count / total * 100) if total > 0 else 0

        status_parts: list[str] = []
        for col_name in ["todo", "in_progress", "done"]:
            label_map = {"todo": "\ud560\uc77c", "in_progress": "\uc9c4\ud589\uc911", "done": "\uc644\ub8cc"}
            cnt = col_counts.get(col_name, 0)
            if cnt > 0 or col_name in ("todo", "in_progress", "done"):
                status_parts.append(f"{label_map.get(col_name, col_name)}: {cnt}")
        status_parts.append(f"(\uc9c4\ud589\ub960 {progress}%)")
        lines.append(" / ".join(status_parts))
        lines.append("")

        lines.append("| \uc0c1\ud0dc | \uc6b0\uc120\uc21c\uc704 | \uc81c\ubaa9 | \ub2f4\ub2f9 |")
        lines.append("|------|---------|------|------|")
        for t in todo_items:
            col = t.get("column", "todo")
            priority = t.get("priority", "")
            title = t.get("title", "")
            assignee = t.get("assignee", "")
            if col == "done":
                lines.append(
                    f"| {_strike(col)} | {_strike(priority)} "
                    f"| {_strike(title)} | {_strike(assignee)} |"
                )
            else:
                lines.append(f"| {col} | {priority} | {title} | {assignee} |")
    else:
        lines.append("(\uc5c6\uc74c)")
    lines.append("")

    # -- Issues --
    lines.append(f"## Issues ({len(issue_items)})")
    lines.append("")
    if issue_items:
        open_count = sum(
            1 for i in issue_items if i.get("status") not in ("resolved", "closed")
        )
        resolved_count = len(issue_items) - open_count
        lines.append(f"\uc5f4\ub9bc: {open_count} / \ud574\uacb0: {resolved_count}")
        lines.append("")

        lines.append("| \uc0c1\ud0dc | \uc6b0\uc120\uc21c\uc704 | \uc81c\ubaa9 | \ub2f4\ub2f9 | \ub77c\ubca8 |")
        lines.append("|------|---------|------|------|------|")
        for i in issue_items:
            status = i.get("status", "")
            priority = i.get("priority", "")
            title = i.get("title", "")
            assignee = i.get("assignee", "")
            labels = ", ".join(i.get("labels", []))
            if status in ("resolved", "closed"):
                lines.append(
                    f"| {_strike(status)} | {_strike(priority)} "
                    f"| {_strike(title)} | {_strike(assignee)} "
                    f"| {_strike(labels)} |"
                )
            else:
                lines.append(
                    f"| {status} | {priority} | {title} | {assignee} | {labels} |"
                )
    else:
        lines.append("(\uc5c6\uc74c)")
    lines.append("")

    # -- Schedule --
    lines.append("## Schedule")
    lines.append("")

    # Tasks
    lines.append(f"### Tasks ({len(schedule_tasks)})")
    lines.append("")
    if schedule_tasks:
        lines.append("| \uc81c\ubaa9 | \uae30\uac04 | \uc0c1\ud0dc | \uce74\ud14c\uace0\ub9ac |")
        lines.append("|------|------|------|----------|")
        for t in schedule_tasks:
            title = t.get("title", "")
            start = _format_date_short(t.get("start_date", ""))
            end = _format_date_short(t.get("end_date", ""))
            if start and end and start != end:
                period = f"{start} ~ {end}"
            elif start:
                period = start
            else:
                period = ""
            status = t.get("status", "")
            category = t.get("category", "")
            lines.append(f"| {title} | {period} | {status} | {category} |")
    else:
        lines.append("(\uc5c6\uc74c)")
    lines.append("")

    # Milestones
    lines.append("### Milestones")
    lines.append("")
    if schedule_milestones:
        lines.append("| \uc81c\ubaa9 | \ub0a0\uc9dc | \uc0c1\ud0dc |")
        lines.append("|------|------|------|")
        for m in schedule_milestones:
            title = m.get("title", "")
            date_str = _format_date_short(m.get("date", ""))
            status = m.get("status", "")
            lines.append(f"| {title} | {date_str} | {status} |")
    else:
        lines.append("(\uc5c6\uc74c)")
    lines.append("")

    # -- Subtasks --
    if subtask_items:
        pending = sum(1 for s in subtask_items if s.get("status") != "done")
        done_sub = len(subtask_items) - pending
        lines.append(f"## Subtasks ({len(subtask_items)})")
        lines.append("")
        lines.append(
            f"\ub300\uae30: {pending} / \uc644\ub8cc: {done_sub}"
        )
        lines.append("")
        lines.append("| \uc0c1\ud0dc | \uc81c\ubaa9 |")
        lines.append("|------|------|")
        for s in subtask_items:
            status = s.get("status", "pending")
            title = s.get("title", "")
            if status == "done":
                lines.append(f"| {_strike(status)} | {_strike(title)} |")
            else:
                lines.append(f"| {status} | {title} |")
        lines.append("")

    # Write file
    settings_dir = docs_path / "_settings"
    settings_dir.mkdir(parents=True, exist_ok=True)
    meta_file = settings_dir / "_project_meta.md"
    meta_file.write_text("\n".join(lines), encoding="utf-8")

    return {
        "success": True,
        "project": project_name,
        "path": str(meta_file),
        "generated_at": now,
    }


def generate_all_meta() -> dict[str, Any]:
    """Run generate_meta() for all projects. Return summary with counts."""
    results: list[dict[str, Any]] = []
    errors: list[str] = []

    for stage_folder in STAGE_FOLDERS.values():
        stage_path = PROJECTS_ROOT / stage_folder
        if not stage_path.is_dir():
            continue
        for item in sorted(stage_path.iterdir()):
            if not item.is_dir():
                continue
            if item.name.startswith("."):
                continue
            if item.name in COMMON_FOLDERS or item.name.startswith("_"):
                continue

            try:
                result = generate_meta(item.name)
                if result.get("success"):
                    results.append(result)
                else:
                    errors.append(f"{item.name}: {result.get('message', 'unknown')}")
            except Exception as e:
                errors.append(f"{item.name}: {e}")

    return {
        "success": True,
        "total": len(results) + len(errors),
        "generated": len(results),
        "errors": len(errors),
        "error_details": errors if errors else None,
    }
