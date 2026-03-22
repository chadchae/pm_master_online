"""Miscellaneous endpoints: card-order, discussions, work-instructions,
work-status, todos, issues, subtasks, schedule, websocket terminal."""

import asyncio
import json
import os
import pty
import select
import struct
import fcntl
import termios

from pathlib import Path

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from services import auth_service, scanner_service
from services import todo_service, issue_service, subtask_service, schedule_service
from routers.deps import refresh_meta

router = APIRouter(prefix="/api", tags=["misc"])


# --- Work instruction endpoints ---

@router.get("/work-instructions")
def list_work_instructions():
    """Scan all projects for pending work instructions."""
    instructions = scanner_service.scan_work_instructions()
    return {"instructions": instructions}


@router.get("/work-status")
def get_work_status():
    """Get comprehensive work status summary across all projects."""
    instructions = scanner_service.scan_work_instructions()
    projects = scanner_service.scan_projects()

    # Build status per project
    project_status: list[dict] = []
    for inst in instructions:
        # Find matching project metadata
        proj_meta = next(
            (p for p in projects if p["name"] == inst["project"]), None
        )
        stage_label = inst["stage"].split("_", 1)[1].replace("_", " ").title() if "_" in inst["stage"] else inst["stage"]
        pct = round(inst["done"] / inst["total"] * 100) if inst["total"] > 0 else 0

        project_status.append({
            "project": inst["project"],
            "label": proj_meta["metadata"].get("label", inst["project"]) if proj_meta else inst["project"],
            "stage": inst["stage"],
            "stage_label": stage_label,
            "date": inst["date"],
            "total_tasks": inst["total"],
            "done_tasks": inst["done"],
            "pending_tasks": len(inst["unchecked"]),
            "progress_pct": pct,
            "instructions": [b["text"] for b in inst["blocks"]],
            "pending_items": inst["unchecked"],
            "completed_items": inst["checked"],
        })

    # Overall summary
    total_projects = len(project_status)
    total_tasks = sum(p["total_tasks"] for p in project_status)
    total_done = sum(p["done_tasks"] for p in project_status)
    total_pending = sum(p["pending_tasks"] for p in project_status)
    overall_pct = round(total_done / total_tasks * 100) if total_tasks > 0 else 0

    return {
        "summary": {
            "projects_with_instructions": total_projects,
            "total_tasks": total_tasks,
            "done": total_done,
            "pending": total_pending,
            "overall_progress": overall_pct,
        },
        "projects": project_status,
    }


class MarkDoneRequest(BaseModel):
    project_name: str
    filename: str
    item_text: str
    project_path: str = ""


@router.post("/work-instructions/mark-done")
def mark_instruction_done(body: MarkDoneRequest):
    """Mark a checklist item as done."""
    result = scanner_service.mark_instruction_done(
        body.project_name, body.filename, body.item_text, body.project_path
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


class ExecuteInstructionRequest(BaseModel):
    project_name: str
    instruction: str


@router.post("/work-instructions/execute")
async def execute_instruction(body: ExecuteInstructionRequest):
    """Launch Claude Code in a new Terminal with the work instruction."""
    project_path = scanner_service._find_project_path(body.project_name)
    if project_path is None:
        raise HTTPException(status_code=404, detail="Project not found")

    # Escape for shell
    escaped_instruction = body.instruction.replace('"', '\\"').replace("'", "\\'")
    project_dir = str(project_path)

    # Open Terminal.app with claude command
    applescript = f'''tell application "Terminal"
    activate
    do script "cd \\"{project_dir}\\" && /Users/chadchae/.local/bin/claude \\"{escaped_instruction}\\""
end tell'''

    proc = await asyncio.create_subprocess_exec(
        "osascript", "-e", applescript,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    await proc.communicate()

    return {"success": True, "message": f"Launched Claude Code for {body.project_name}"}


class CreateInstructionRequest(BaseModel):
    instruction: str
    checklist: list[str] = []


@router.post("/projects/{project_name}/work-instruction")
def create_work_instruction(project_name: str, body: CreateInstructionRequest):
    """Manually create a work instruction for a project."""
    result = scanner_service.create_manual_instruction(
        project_name, body.instruction, body.checklist
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result["message"])
    return result


# --- Card order endpoints ---

CARD_ORDER_FILE = Path(__file__).resolve().parent.parent / "data" / "card_order.json"


def _load_card_order() -> dict:
    if not CARD_ORDER_FILE.exists():
        return {}
    try:
        return json.loads(CARD_ORDER_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def _save_card_order(data: dict) -> None:
    CARD_ORDER_FILE.parent.mkdir(parents=True, exist_ok=True)
    CARD_ORDER_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


class CardOrderRequest(BaseModel):
    stage: str
    order: list[str]  # List of project names in desired order


@router.get("/card-order")
def get_card_order():
    """Get card ordering for all stages."""
    return _load_card_order()


@router.put("/card-order")
def update_card_order(body: CardOrderRequest):
    """Update card order for a stage."""
    data = _load_card_order()
    data[body.stage] = body.order
    _save_card_order(data)
    return {"success": True}


# --- Discussion timeline endpoint ---

@router.get("/discussions/timeline")
def discussions_timeline():
    """Return a timeline of all discussion entries across projects."""
    discussions = scanner_service.scan_discussions()
    return {"discussions": discussions}


# --- Cross-project todos endpoint ---

@router.get("/todos/all")
def list_all_todos(include_done: int = 0):
    """List todos across all projects. Use include_done=1 for all items."""
    todos_dir = Path(__file__).resolve().parent.parent / "data" / "todos"
    if not todos_dir.exists():
        return {"projects": []}

    results = []
    for f in sorted(todos_dir.iterdir()):
        if f.suffix == ".json":
            project_name = f.stem
            data = todo_service.list_todos(project_name)
            items = data.get("items", [])
            if not include_done:
                items = [i for i in items if i.get("column") != "done"]
            if items:
                # Resolve label and path
                project_path = scanner_service._find_project_path(project_name)
                label = project_name
                location = ""
                if project_path:
                    meta = scanner_service._read_project_yaml(project_path)
                    label = meta.get("label", project_name)
                    location = str(project_path)
                results.append({
                    "project": project_name,
                    "label": label,
                    "location": location,
                    "columns": data.get("columns", ["todo", "in_progress", "done", "waiting", "archive"]),
                    "items": sorted(
                        items,
                        key=lambda x: (
                            0 if x.get("starred") else 1,
                            {"high": 0, "medium": 1, "low": 2}.get(
                                x.get("priority", "medium"), 1
                            ),
                            x.get("order", 0),
                        ),
                    ),
                })
    # Sort: pm-master-local first, then alphabetical
    PIN = "pm-master-local"
    results.sort(key=lambda r: (0 if r["project"] == PIN else 1, r["project"]))
    return {"projects": results}


# --- Todo endpoints ---

class TodoCreateRequest(BaseModel):
    title: str
    description: str = ""
    column: str = "todo"
    priority: str = "medium"
    assignee: str = ""


class TodoUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    priority: str | None = None
    assignee: str | None = None
    starred: bool | None = None


class TodoMoveRequest(BaseModel):
    column: str
    order: int


@router.get("/projects/{project_name}/todos")
def list_todos(project_name: str):
    """List all todos for a project."""
    data = todo_service.list_todos(project_name)
    return data


@router.post("/projects/{project_name}/todos")
def create_todo(project_name: str, body: TodoCreateRequest):
    """Create a new todo item."""
    todo = todo_service.create_todo(project_name, body.model_dump())
    refresh_meta(project_name)
    return todo


@router.put("/projects/{project_name}/todos/{todo_id}")
def update_todo(project_name: str, todo_id: str, body: TodoUpdateRequest):
    """Update a todo item."""
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    todo = todo_service.update_todo(project_name, todo_id, updates)
    if todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    refresh_meta(project_name)
    return todo


@router.delete("/projects/{project_name}/todos/{todo_id}")
def delete_todo(project_name: str, todo_id: str):
    """Delete a todo item."""
    success = todo_service.delete_todo(project_name, todo_id)
    if not success:
        raise HTTPException(status_code=404, detail="Todo not found")
    refresh_meta(project_name)
    return {"success": True}


@router.put("/projects/{project_name}/todos/{todo_id}/move")
def move_todo(project_name: str, todo_id: str, body: TodoMoveRequest):
    """Move a todo to a different column/position."""
    todo = todo_service.move_todo(project_name, todo_id, body.column, body.order)
    if todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    refresh_meta(project_name)
    return todo


# --- All-projects issues endpoint ---

@router.get("/issues/all")
def list_all_issues():
    """List all issues across all projects with project info."""
    projects = scanner_service.scan_projects()
    all_issues: list[dict] = []
    for proj in projects:
        try:
            data = issue_service.list_issues(proj["name"])
            issues = data.get("issues", [])
            for issue in issues:
                issue["_project_name"] = proj["name"]
                issue["_project_label"] = proj.get("metadata", {}).get("label", proj["name"])
                issue["_project_type"] = proj.get("metadata", {}).get("\uc720\ud615", "")
            all_issues.extend(issues)
        except Exception:
            pass
    return {"issues": all_issues}


# --- Issue endpoints ---

class IssueCreateRequest(BaseModel):
    title: str
    description: str = ""
    status: str = "open"
    priority: str = "medium"
    labels: list[str] = []
    assignee: str = ""


class IssueUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    labels: list[str] | None = None
    assignee: str | None = None


class IssueCommentRequest(BaseModel):
    author: str
    content: str


@router.get("/projects/{project_name}/issues")
def list_issues(project_name: str):
    """List all issues for a project."""
    data = issue_service.list_issues(project_name)
    return data


@router.post("/projects/{project_name}/issues")
def create_issue(project_name: str, body: IssueCreateRequest):
    """Create a new issue."""
    issue = issue_service.create_issue(project_name, body.model_dump())
    refresh_meta(project_name)
    return issue


@router.put("/projects/{project_name}/issues/{issue_id}")
def update_issue(project_name: str, issue_id: str, body: IssueUpdateRequest):
    """Update an issue."""
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    issue = issue_service.update_issue(project_name, issue_id, updates)
    if issue is None:
        raise HTTPException(status_code=404, detail="Issue not found")
    refresh_meta(project_name)
    return issue


@router.delete("/projects/{project_name}/issues/{issue_id}")
def delete_issue(project_name: str, issue_id: str):
    """Delete an issue."""
    success = issue_service.delete_issue(project_name, issue_id)
    if not success:
        raise HTTPException(status_code=404, detail="Issue not found")
    refresh_meta(project_name)
    return {"success": True}


@router.post("/projects/{project_name}/issues/{issue_id}/comments")
def add_issue_comment(project_name: str, issue_id: str, body: IssueCommentRequest):
    """Add a comment to an issue."""
    issue = issue_service.add_comment(
        project_name, issue_id, body.author, body.content
    )
    if issue is None:
        raise HTTPException(status_code=404, detail="Issue not found")
    refresh_meta(project_name)
    return issue


@router.post("/projects/{project_name}/issues/{issue_id}/resolve")
def resolve_issue(project_name: str, issue_id: str):
    """Resolve an issue."""
    issue = issue_service.resolve_issue(project_name, issue_id)
    if issue is None:
        raise HTTPException(status_code=404, detail="Issue not found")
    refresh_meta(project_name)
    return issue


class CommentUpdateRequest(BaseModel):
    content: str


@router.put("/projects/{project_name}/issues/{issue_id}/comments/{comment_id}")
def update_issue_comment(project_name: str, issue_id: str, comment_id: str, body: CommentUpdateRequest):
    """Update a comment."""
    issue = issue_service.update_comment(project_name, issue_id, comment_id, body.content)
    if issue is None:
        raise HTTPException(status_code=404, detail="Comment not found")
    return issue


@router.delete("/projects/{project_name}/issues/{issue_id}/comments/{comment_id}")
def delete_issue_comment(project_name: str, issue_id: str, comment_id: str):
    """Delete a comment."""
    issue = issue_service.delete_comment(project_name, issue_id, comment_id)
    if issue is None:
        raise HTTPException(status_code=404, detail="Comment not found")
    return issue


# --- Subtask endpoints ---

class SubtaskCreateRequest(BaseModel):
    title: str
    description: str = ""


class SubtaskUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None


class SubtaskToggleRequest(BaseModel):
    status: str  # "pending" | "done" | "cancelled"


class SubtaskReorderRequest(BaseModel):
    ordered_ids: list[str]


@router.put("/projects/{project_name}/subtasks/reorder")
def reorder_subtasks(project_name: str, body: SubtaskReorderRequest):
    """Reorder subtasks based on ID list."""
    data = subtask_service.reorder_subtasks(project_name, body.ordered_ids)
    return data


@router.get("/projects/{project_name}/subtasks")
def list_subtasks(project_name: str):
    """List all subtasks for a project."""
    return subtask_service.list_subtasks(project_name)


@router.post("/projects/{project_name}/subtasks")
def create_subtask(project_name: str, body: SubtaskCreateRequest):
    """Create a new subtask."""
    subtask = subtask_service.create_subtask(project_name, body.title, body.description)
    refresh_meta(project_name)
    return subtask


@router.put("/projects/{project_name}/subtasks/{subtask_id}")
def update_subtask(project_name: str, subtask_id: str, body: SubtaskUpdateRequest):
    """Update a subtask's title/description."""
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    subtask = subtask_service.update_subtask(project_name, subtask_id, updates)
    if subtask is None:
        raise HTTPException(status_code=404, detail="Subtask not found")
    refresh_meta(project_name)
    return subtask


@router.delete("/projects/{project_name}/subtasks/{subtask_id}")
def delete_subtask(project_name: str, subtask_id: str):
    """Delete a subtask."""
    success = subtask_service.delete_subtask(project_name, subtask_id)
    if not success:
        raise HTTPException(status_code=404, detail="Subtask not found")
    refresh_meta(project_name)
    return {"success": True}


@router.put("/projects/{project_name}/subtasks/{subtask_id}/toggle")
def toggle_subtask(project_name: str, subtask_id: str, body: SubtaskToggleRequest):
    """Toggle subtask status (pending/done/cancelled)."""
    subtask = subtask_service.toggle_subtask(project_name, subtask_id, body.status)
    if subtask is None:
        raise HTTPException(status_code=404, detail="Subtask not found or invalid status")
    refresh_meta(project_name)
    return subtask


# --- Schedule endpoints ---

class ScheduleTaskCreateRequest(BaseModel):
    title: str
    description: str = ""
    start_date: str = ""
    end_date: str = ""
    assignee: str = ""
    status: str = "planned"
    depends_on: list[str] = []
    parent_id: str = ""
    category: str = ""
    progress_pct: int = 0


class ScheduleTaskUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    assignee: str | None = None
    status: str | None = None
    depends_on: list[str] | None = None
    parent_id: str | None = None
    category: str | None = None
    progress_pct: int | None = None


class CategoryCreateRequest(BaseModel):
    name: str
    color: str = "#6b7280"


class ScheduleReorderRequest(BaseModel):
    ordered_ids: list[str]


class MilestoneCreateRequest(BaseModel):
    title: str
    date: str = ""
    description: str = ""
    linked_tasks: list[str] = []
    status: str = "upcoming"


class MilestoneUpdateRequest(BaseModel):
    title: str | None = None
    date: str | None = None
    description: str | None = None
    linked_tasks: list[str] | None = None
    status: str | None = None


@router.get("/projects/{project_name}/schedule")
def list_schedule(project_name: str):
    """List full schedule data for a project."""
    return schedule_service.list_schedule(project_name)


@router.post("/projects/{project_name}/schedule/tasks")
def create_schedule_task(project_name: str, body: ScheduleTaskCreateRequest):
    """Create a new schedule task."""
    result = schedule_service.create_task(project_name, body.model_dump())
    refresh_meta(project_name)
    return result


@router.put("/projects/{project_name}/schedule/tasks/reorder")
def reorder_schedule_tasks(project_name: str, body: ScheduleReorderRequest):
    """Reorder schedule tasks."""
    result = schedule_service.reorder_tasks(project_name, body.ordered_ids)
    refresh_meta(project_name)
    return result


@router.put("/projects/{project_name}/schedule/tasks/{task_id}")
def update_schedule_task(project_name: str, task_id: str, body: ScheduleTaskUpdateRequest):
    """Update a schedule task."""
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    result = schedule_service.update_task(project_name, task_id, updates)
    if result is None:
        raise HTTPException(status_code=404, detail="Task not found")
    if isinstance(result, dict) and result.get("error") == "predecessor_not_done":
        raise HTTPException(
            status_code=409,
            detail="Predecessor tasks must be completed first",
        )
    refresh_meta(project_name)
    return result


@router.delete("/projects/{project_name}/schedule/tasks/{task_id}")
def delete_schedule_task(project_name: str, task_id: str):
    """Delete a schedule task."""
    success = schedule_service.delete_task(project_name, task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    refresh_meta(project_name)
    return {"success": True}


@router.post("/projects/{project_name}/schedule/milestones")
def create_milestone(project_name: str, body: MilestoneCreateRequest):
    """Create a new milestone."""
    result = schedule_service.create_milestone(project_name, body.model_dump())
    refresh_meta(project_name)
    return result


@router.put("/projects/{project_name}/schedule/milestones/{ms_id}")
def update_milestone(project_name: str, ms_id: str, body: MilestoneUpdateRequest):
    """Update a milestone."""
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    ms = schedule_service.update_milestone(project_name, ms_id, updates)
    if ms is None:
        raise HTTPException(status_code=404, detail="Milestone not found")
    refresh_meta(project_name)
    return ms


@router.delete("/projects/{project_name}/schedule/milestones/{ms_id}")
def delete_milestone(project_name: str, ms_id: str):
    """Delete a milestone."""
    success = schedule_service.delete_milestone(project_name, ms_id)
    if not success:
        raise HTTPException(status_code=404, detail="Milestone not found")
    refresh_meta(project_name)
    return {"success": True}


@router.post("/projects/{project_name}/schedule/categories")
def create_category(project_name: str, body: CategoryCreateRequest):
    """Create a new schedule category."""
    return schedule_service.create_category(project_name, body.name, body.color)


@router.delete("/projects/{project_name}/schedule/categories/{category_name}")
def delete_category(project_name: str, category_name: str):
    """Delete a schedule category."""
    success = schedule_service.delete_category(project_name, category_name)
    if not success:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"success": True}


class CategoryRenameRequest(BaseModel):
    new_name: str


@router.put("/projects/{project_name}/schedule/categories/{category_name}")
def rename_category(project_name: str, category_name: str, body: CategoryRenameRequest):
    """Rename a schedule category."""
    success = schedule_service.rename_category(project_name, category_name, body.new_name)
    if not success:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"success": True}


# --- WebSocket Terminal ---
# Note: This is registered directly on the app in main.py since WebSocket
# routes on APIRouter require the full path. We define the handler here
# and export it for main.py to use.

async def websocket_terminal(ws: WebSocket):
    """WebSocket endpoint for embedded terminal with PTY."""
    await ws.accept()

    # Receive initial config: {project_path, command}
    try:
        config = await ws.receive_json()
    except WebSocketDisconnect:
        return

    project_path = config.get("project_path", os.path.expanduser("~"))
    command = config.get("command", "/bin/zsh")

    # Verify auth token from query params
    token = config.get("token", "")
    if not auth_service.verify_token(token):
        await ws.send_json({"type": "error", "data": "Unauthorized"})
        await ws.close()
        return

    # Fork a PTY
    child_pid, fd = pty.fork()

    if child_pid == 0:
        # Child process
        os.chdir(project_path)
        os.environ["TERM"] = "xterm-256color"
        if command:
            os.execvp("/bin/zsh", ["/bin/zsh", "-l", "-c", command])
        else:
            os.execvp("/bin/zsh", ["/bin/zsh", "-l"])
    else:
        # Parent process -- bridge PTY <-> WebSocket
        # Set non-blocking
        flags = fcntl.fcntl(fd, fcntl.F_GETFL)
        fcntl.fcntl(fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)

        # Set initial terminal size
        winsize = struct.pack("HHHH", 24, 120, 0, 0)
        fcntl.ioctl(fd, termios.TIOCSWINSZ, winsize)

        async def read_pty():
            """Read from PTY and send to WebSocket."""
            try:
                while True:
                    await asyncio.sleep(0.01)
                    try:
                        r, _, _ = select.select([fd], [], [], 0)
                        if r:
                            data = os.read(fd, 4096)
                            if data:
                                await ws.send_bytes(data)
                            else:
                                break
                    except OSError:
                        break
            except (WebSocketDisconnect, Exception):
                pass

        async def write_pty():
            """Read from WebSocket and write to PTY."""
            try:
                while True:
                    msg = await ws.receive()
                    if msg["type"] == "websocket.receive":
                        if "bytes" in msg and msg["bytes"]:
                            os.write(fd, msg["bytes"])
                        elif "text" in msg and msg["text"]:
                            try:
                                data = json.loads(msg["text"])
                                if data.get("type") == "resize":
                                    rows = data.get("rows", 24)
                                    cols = data.get("cols", 120)
                                    winsize = struct.pack("HHHH", rows, cols, 0, 0)
                                    fcntl.ioctl(fd, termios.TIOCSWINSZ, winsize)
                                elif data.get("type") == "input":
                                    os.write(fd, data["data"].encode())
                            except (json.JSONDecodeError, KeyError):
                                os.write(fd, msg["text"].encode())
                    elif msg["type"] == "websocket.disconnect":
                        break
            except (WebSocketDisconnect, Exception):
                pass

        try:
            await asyncio.gather(read_pty(), write_pty())
        finally:
            os.close(fd)
            try:
                os.kill(child_pid, 9)
                os.waitpid(child_pid, 0)
            except OSError:
                pass
