"""Project Manager Backend - FastAPI application."""

import asyncio
import json
import os
import pty
import select
import struct
import fcntl
import termios

from pathlib import Path
from fastapi import FastAPI, Request, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel

from services import auth_service, scanner_service, document_service
from services import common_folder_service, server_service, people_service
from services import todo_service, issue_service, subtask_service, schedule_service

app = FastAPI(title="Project Manager", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Auth middleware ---

# Routes that don't require authentication
PUBLIC_PATHS = {"/api/auth/login", "/api/health", "/docs", "/openapi.json", "/redoc"}


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    """Protect all /api/* routes except public ones."""
    path = request.url.path

    # Allow public paths
    if path in PUBLIC_PATHS:
        return await call_next(request)

    # Only protect /api/* routes
    if not path.startswith("/api/"):
        return await call_next(request)

    # Check authorization header or query token (for downloads)
    auth_header = request.headers.get("Authorization", "")
    token = ""
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    elif "token" in request.query_params:
        token = request.query_params["token"]

    if not token:
        return JSONResponse(
            status_code=401,
            content={"detail": "Missing or invalid authorization header"},
        )
    if not auth_service.verify_token(token):
        return JSONResponse(
            status_code=401,
            content={"detail": "Invalid or expired token"},
        )

    return await call_next(request)


# --- Health ---

@app.get("/api/health")
def health():
    """Health check endpoint."""
    return {"status": "ok", "app": "Project Manager"}


# --- Auth endpoints ---

class LoginRequest(BaseModel):
    password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@app.post("/api/auth/login")
def login(body: LoginRequest):
    """Authenticate with password and receive a token."""
    token = auth_service.login(body.password)
    if token is None:
        raise HTTPException(status_code=401, detail="Invalid password")
    return {"token": token}


@app.post("/api/auth/change-password")
def change_password(body: ChangePasswordRequest):
    """Change the password."""
    success = auth_service.change_password(body.current_password, body.new_password)
    if not success:
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    return {"message": "Password changed successfully"}


@app.get("/api/auth/verify")
def verify_token(request: Request):
    """Verify token validity (already checked by middleware)."""
    return {"valid": True}


# --- Migration endpoint ---

@app.post("/api/migrate/yaml-frontmatter")
def migrate_yaml_frontmatter():
    """Migrate all _아이디어노트.md from blockquote to YAML frontmatter."""
    result = scanner_service.migrate_to_yaml_frontmatter()
    return result


# --- Project scanner endpoints ---

@app.get("/api/projects")
def list_projects():
    """Scan and list all projects."""
    projects = scanner_service.scan_projects()
    return {"projects": projects}


@app.delete("/api/projects/{project_name}")
def delete_project(project_name: str):
    """Permanently delete a project folder (only from 7_discarded)."""
    result = scanner_service.delete_project(project_name)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


class RestoreProjectRequest(BaseModel):
    target_stage: str = "1_idea_stage"


@app.post("/api/projects/{project_name}/restore")
def restore_project(project_name: str, body: RestoreProjectRequest):
    """Restore a discarded project back to a stage."""
    result = scanner_service.move_project(project_name, "7_discarded", body.target_stage)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


class UpdateMetadataRequest(BaseModel):
    metadata: dict[str, str]


@app.put("/api/projects/{project_name}/metadata")
def update_metadata(project_name: str, body: UpdateMetadataRequest):
    """Update a project's metadata tags in _아이디어노트.md."""
    result = scanner_service.update_metadata(project_name, body.metadata)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


class UpdateDescriptionRequest(BaseModel):
    description: str


@app.put("/api/projects/{project_name}/description")
def update_description(project_name: str, body: UpdateDescriptionRequest):
    """Update a project's description in _아이디어노트.md."""
    result = scanner_service.update_description(project_name, body.description)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


class CreateProjectRequest(BaseModel):
    folder_name: str
    label: str = ""
    description: str = ""
    project_type: str = ""
    stage: str = "1_idea_stage"


@app.post("/api/projects/create")
def create_project(body: CreateProjectRequest):
    """Create a new project/idea with folder and docs."""
    result = scanner_service.create_project(
        body.folder_name, body.label, body.description, body.project_type, body.stage
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


class MoveProjectRequest(BaseModel):
    project_name: str
    from_stage: str
    to_stage: str
    instruction: str = ""


@app.post("/api/projects/move")
def move_project(body: MoveProjectRequest):
    """Move a project between stage folders with optional work instruction."""
    result = scanner_service.move_project(
        body.project_name, body.from_stage, body.to_stage
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])

    # Create work instruction note if provided
    if body.instruction.strip():
        note_result = scanner_service.create_transition_note(
            body.project_name, body.from_stage, body.to_stage, body.instruction
        )
        result["note_created"] = note_result.get("filename")

    return result


# --- Work instruction endpoints ---

@app.get("/api/work-instructions")
def list_work_instructions():
    """Scan all projects for pending work instructions."""
    instructions = scanner_service.scan_work_instructions()
    return {"instructions": instructions}


@app.get("/api/work-status")
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


@app.post("/api/work-instructions/mark-done")
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


@app.post("/api/work-instructions/execute")
async def execute_instruction(body: ExecuteInstructionRequest):
    """Launch Claude Code in a new Terminal with the work instruction."""
    import asyncio

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


@app.post("/api/projects/{project_name}/work-instruction")
def create_work_instruction(project_name: str, body: CreateInstructionRequest):
    """Manually create a work instruction for a project."""
    result = scanner_service.create_manual_instruction(
        project_name, body.instruction, body.checklist
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result["message"])
    return result


# --- Document browser endpoints ---

@app.get("/api/projects/{project_name}/docs")
def list_project_docs(project_name: str, subpath: str = ""):
    """List files in a project's docs/ directory (with optional subfolder)."""
    docs = document_service.list_docs(project_name, subpath)
    return {"docs": docs}


@app.get("/api/projects/{project_name}/docs/{filename:path}")
def read_project_doc(project_name: str, filename: str):
    """Read a markdown file from a project's docs/ directory."""
    content = document_service.read_doc(project_name, filename)
    if content is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"content": content, "filename": filename}


class SaveDocRequest(BaseModel):
    content: str


@app.put("/api/projects/{project_name}/docs/{filename:path}")
def save_project_doc(project_name: str, filename: str, body: SaveDocRequest):
    """Save/update a markdown file in a project's docs/ directory."""
    result = document_service.write_doc(project_name, filename, body.content)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@app.delete("/api/projects/{project_name}/docs/{filename:path}")
def delete_project_doc(project_name: str, filename: str):
    """Delete a document from a project's docs/ directory."""
    result = document_service.delete_doc(project_name, filename)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


class FolderRequest(BaseModel):
    folder_name: str


@app.post("/api/projects/{project_name}/folders")
def create_folder(project_name: str, body: FolderRequest):
    """Create a subfolder in a project's docs/ directory."""
    result = document_service.create_folder(project_name, body.folder_name)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@app.delete("/api/projects/{project_name}/folders/{folder_name}")
def delete_folder(project_name: str, folder_name: str):
    """Delete a subfolder from a project's docs/ directory."""
    result = document_service.delete_folder(project_name, folder_name)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@app.get("/api/search")
def search_docs(q: str = ""):
    """Full-text search across all project docs."""
    results = document_service.search_docs(q)
    return {"query": q, "results": results}


# --- Common folders endpoints ---

@app.get("/api/common/{folder_type}")
def list_common_files(folder_type: str, subpath: str = ""):
    """List files in a common folder (_notes, _learning, etc.)."""
    if folder_type not in common_folder_service.FOLDER_TYPE_MAP:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid folder type. Must be one of: {list(common_folder_service.FOLDER_TYPE_MAP.keys())}",
        )
    files = common_folder_service.list_files_at(folder_type, subpath)
    return {"folder_type": folder_type, "files": files}


@app.get("/api/common/{folder_type}/{filename:path}")
def read_common_file(folder_type: str, filename: str):
    """Read a file from a common folder."""
    if folder_type not in common_folder_service.FOLDER_TYPE_MAP:
        raise HTTPException(status_code=400, detail="Invalid folder type")
    content = common_folder_service.read_file(folder_type, filename)
    if content is None:
        raise HTTPException(status_code=404, detail="File not found")
    return {"content": content, "filename": filename}


class SaveFileRequest(BaseModel):
    content: str


@app.put("/api/common/{folder_type}/{filename:path}")
def save_common_file(folder_type: str, filename: str, body: SaveFileRequest):
    """Save/update a file in a common folder."""
    if folder_type not in common_folder_service.FOLDER_TYPE_MAP:
        raise HTTPException(status_code=400, detail="Invalid folder type")
    result = common_folder_service.write_file(folder_type, filename, body.content)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@app.delete("/api/common/{folder_type}/{filename:path}")
def delete_common_file(folder_type: str, filename: str):
    """Delete a file from a common folder."""
    if folder_type not in common_folder_service.FOLDER_TYPE_MAP:
        raise HTTPException(status_code=400, detail="Invalid folder type")
    result = common_folder_service.delete_file(folder_type, filename)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


class SubfolderRequest(BaseModel):
    folder_name: str


@app.post("/api/common/{folder_type}/folders")
def create_common_subfolder(folder_type: str, body: SubfolderRequest):
    """Create a subfolder in a common folder."""
    if folder_type not in common_folder_service.FOLDER_TYPE_MAP:
        raise HTTPException(status_code=400, detail="Invalid folder type")
    result = common_folder_service.create_subfolder(folder_type, body.folder_name)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@app.delete("/api/common/{folder_type}/folders/{folder_name}")
def delete_common_subfolder(folder_type: str, folder_name: str):
    """Delete a subfolder from a common folder."""
    if folder_type not in common_folder_service.FOLDER_TYPE_MAP:
        raise HTTPException(status_code=400, detail="Invalid folder type")
    result = common_folder_service.delete_subfolder(folder_type, folder_name)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


# --- Quick Notes endpoints ---

class QuickNoteRequest(BaseModel):
    title: str
    content: str

class MoveNoteRequest(BaseModel):
    filename: str
    target_file: str


@app.get("/api/quicknotes")
def list_quicknotes():
    """List quick notes from _notes/_temp/."""
    notes = common_folder_service.list_quicknotes()
    return {"notes": notes}


@app.post("/api/quicknotes")
def create_quicknote(body: QuickNoteRequest):
    """Create a new quick note."""
    result = common_folder_service.create_quicknote(body.title, body.content)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@app.delete("/api/quicknotes/{filename}")
def delete_quicknote(filename: str):
    """Delete a quick note."""
    result = common_folder_service.delete_quicknote(filename)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@app.post("/api/quicknotes/move")
def move_quicknote(body: MoveNoteRequest):
    """Move a quick note to a permanent notes file (append)."""
    result = common_folder_service.move_quicknote(body.filename, body.target_file)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


# --- WebSocket Terminal ---

@app.websocket("/ws/terminal")
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
        os.execvp("/bin/zsh", ["/bin/zsh", "-l", "-c", command])
    else:
        # Parent process — bridge PTY <-> WebSocket
        # Set non-blocking
        flags = fcntl.fcntl(fd, fcntl.F_GETFL)
        fcntl.fcntl(fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)

        # Set initial terminal size
        winsize = struct.pack("HHHH", 24, 120, 0, 0)
        fcntl.ioctl(fd, termios.TIOCSWINSZ, winsize)

        async def read_pty():
            """Read from PTY and send to WebSocket."""
            loop = asyncio.get_event_loop()
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
                            import json
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


# --- Card order endpoints ---

CARD_ORDER_FILE = Path(__file__).parent / "data" / "card_order.json"


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


@app.get("/api/card-order")
def get_card_order():
    """Get card ordering for all stages."""
    return _load_card_order()


@app.put("/api/card-order")
def update_card_order(body: CardOrderRequest):
    """Update card order for a stage."""
    data = _load_card_order()
    data[body.stage] = body.order
    _save_card_order(data)
    return {"success": True}


# --- Discussion timeline endpoint ---

@app.get("/api/discussions/timeline")
def discussions_timeline():
    """Return a timeline of all discussion entries across projects."""
    discussions = scanner_service.scan_discussions()
    return {"discussions": discussions}


# --- Server log endpoint ---

@app.get("/api/servers/{project_name}/logs")
def server_logs(project_name: str, lines: int = 100):
    """Read last N lines from a project's backend log file."""
    log_path = Path(f"/tmp/{project_name.lower()}_backend.log")
    if not log_path.is_file():
        return {"lines": [], "project": project_name}
    try:
        all_lines = log_path.read_text(encoding="utf-8", errors="replace").splitlines()
        tail = all_lines[-lines:] if len(all_lines) > lines else all_lines
        return {"lines": tail, "project": project_name}
    except OSError:
        return {"lines": [], "project": project_name}


# --- Server control endpoints ---

@app.get("/api/servers/status")
def server_status():
    """Scan all projects for running servers."""
    statuses = server_service.get_server_status()
    return {"servers": statuses}


@app.post("/api/servers/{project_name}/start")
async def start_server(project_name: str):
    """Start a project's dev server."""
    result = await server_service.run_server_command(project_name, "start")
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@app.post("/api/servers/{project_name}/stop")
async def stop_server(project_name: str):
    """Stop a project's dev server."""
    result = await server_service.run_server_command(project_name, "stop")
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@app.post("/api/servers/{project_name}/restart")
async def restart_server(project_name: str):
    """Restart a project's dev server."""
    result = await server_service.run_server_command(project_name, "restart")
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


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


class TodoMoveRequest(BaseModel):
    column: str
    order: int


@app.get("/api/projects/{project_name}/todos")
def list_todos(project_name: str):
    """List all todos for a project."""
    data = todo_service.list_todos(project_name)
    return data


@app.post("/api/projects/{project_name}/todos")
def create_todo(project_name: str, body: TodoCreateRequest):
    """Create a new todo item."""
    todo = todo_service.create_todo(project_name, body.model_dump())
    return todo


@app.put("/api/projects/{project_name}/todos/{todo_id}")
def update_todo(project_name: str, todo_id: str, body: TodoUpdateRequest):
    """Update a todo item."""
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    todo = todo_service.update_todo(project_name, todo_id, updates)
    if todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    return todo


@app.delete("/api/projects/{project_name}/todos/{todo_id}")
def delete_todo(project_name: str, todo_id: str):
    """Delete a todo item."""
    success = todo_service.delete_todo(project_name, todo_id)
    if not success:
        raise HTTPException(status_code=404, detail="Todo not found")
    return {"success": True}


@app.put("/api/projects/{project_name}/todos/{todo_id}/move")
def move_todo(project_name: str, todo_id: str, body: TodoMoveRequest):
    """Move a todo to a different column/position."""
    todo = todo_service.move_todo(project_name, todo_id, body.column, body.order)
    if todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    return todo


@app.get("/api/projects/{project_name}/summary")
def get_project_summary(project_name: str):
    """Get todo/issues/schedule/subtask summary for project header widget."""
    todo_data = todo_service.list_todos(project_name)
    items = todo_data.get("items", [])
    todo_count = len([i for i in items if i["column"] == "todo"])
    progress_count = len([i for i in items if i["column"] == "in_progress"])
    done_count = len([i for i in items if i["column"] == "done"])
    total = len(items)

    issue_data = issue_service.list_issues(project_name)
    issues_list = issue_data.get("issues", [])
    open_issues = len([i for i in issues_list if i["status"] in ("open", "in_progress")])
    resolved_issues = len([i for i in issues_list if i["status"] in ("resolved", "closed")])

    subtask_counts = subtask_service.get_counts(project_name)

    return {
        "todo": {
            "total": total,
            "todo": todo_count,
            "in_progress": progress_count,
            "done": done_count,
            "progress_pct": round(done_count / total * 100) if total > 0 else 0,
        },
        "issues": {
            "total": len(issues_list),
            "open": open_issues,
            "resolved": resolved_issues,
        },
        "subtasks": subtask_counts,
        "schedule": schedule_service.get_summary(project_name),
    }


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


@app.get("/api/projects/{project_name}/issues")
def list_issues(project_name: str):
    """List all issues for a project."""
    data = issue_service.list_issues(project_name)
    return data


@app.post("/api/projects/{project_name}/issues")
def create_issue(project_name: str, body: IssueCreateRequest):
    """Create a new issue."""
    issue = issue_service.create_issue(project_name, body.model_dump())
    return issue


@app.put("/api/projects/{project_name}/issues/{issue_id}")
def update_issue(project_name: str, issue_id: str, body: IssueUpdateRequest):
    """Update an issue."""
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    issue = issue_service.update_issue(project_name, issue_id, updates)
    if issue is None:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue


@app.delete("/api/projects/{project_name}/issues/{issue_id}")
def delete_issue(project_name: str, issue_id: str):
    """Delete an issue."""
    success = issue_service.delete_issue(project_name, issue_id)
    if not success:
        raise HTTPException(status_code=404, detail="Issue not found")
    return {"success": True}


@app.post("/api/projects/{project_name}/issues/{issue_id}/comments")
def add_issue_comment(project_name: str, issue_id: str, body: IssueCommentRequest):
    """Add a comment to an issue."""
    issue = issue_service.add_comment(
        project_name, issue_id, body.author, body.content
    )
    if issue is None:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue


@app.post("/api/projects/{project_name}/issues/{issue_id}/resolve")
def resolve_issue(project_name: str, issue_id: str):
    """Resolve an issue."""
    issue = issue_service.resolve_issue(project_name, issue_id)
    if issue is None:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue


class CommentUpdateRequest(BaseModel):
    content: str


@app.put("/api/projects/{project_name}/issues/{issue_id}/comments/{comment_id}")
def update_issue_comment(project_name: str, issue_id: str, comment_id: str, body: CommentUpdateRequest):
    """Update a comment."""
    issue = issue_service.update_comment(project_name, issue_id, comment_id, body.content)
    if issue is None:
        raise HTTPException(status_code=404, detail="Comment not found")
    return issue


@app.delete("/api/projects/{project_name}/issues/{issue_id}/comments/{comment_id}")
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


@app.get("/api/projects/{project_name}/subtasks")
def list_subtasks(project_name: str):
    """List all subtasks for a project."""
    return subtask_service.list_subtasks(project_name)


@app.post("/api/projects/{project_name}/subtasks")
def create_subtask(project_name: str, body: SubtaskCreateRequest):
    """Create a new subtask."""
    subtask = subtask_service.create_subtask(project_name, body.title, body.description)
    return subtask


@app.put("/api/projects/{project_name}/subtasks/{subtask_id}")
def update_subtask(project_name: str, subtask_id: str, body: SubtaskUpdateRequest):
    """Update a subtask's title/description."""
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    subtask = subtask_service.update_subtask(project_name, subtask_id, updates)
    if subtask is None:
        raise HTTPException(status_code=404, detail="Subtask not found")
    return subtask


@app.delete("/api/projects/{project_name}/subtasks/{subtask_id}")
def delete_subtask(project_name: str, subtask_id: str):
    """Delete a subtask."""
    success = subtask_service.delete_subtask(project_name, subtask_id)
    if not success:
        raise HTTPException(status_code=404, detail="Subtask not found")
    return {"success": True}


@app.put("/api/projects/{project_name}/subtasks/{subtask_id}/toggle")
def toggle_subtask(project_name: str, subtask_id: str, body: SubtaskToggleRequest):
    """Toggle subtask status (pending/done/cancelled)."""
    subtask = subtask_service.toggle_subtask(project_name, subtask_id, body.status)
    if subtask is None:
        raise HTTPException(status_code=404, detail="Subtask not found or invalid status")
    return subtask


@app.put("/api/projects/{project_name}/subtasks/reorder")
def reorder_subtasks(project_name: str, body: SubtaskReorderRequest):
    """Reorder subtasks based on ID list."""
    data = subtask_service.reorder_subtasks(project_name, body.ordered_ids)
    return data


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
    progress_pct: int | None = None


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


@app.get("/api/projects/{project_name}/schedule")
def list_schedule(project_name: str):
    """List full schedule data for a project."""
    return schedule_service.list_schedule(project_name)


@app.post("/api/projects/{project_name}/schedule/tasks")
def create_schedule_task(project_name: str, body: ScheduleTaskCreateRequest):
    """Create a new schedule task."""
    return schedule_service.create_task(project_name, body.model_dump())


@app.put("/api/projects/{project_name}/schedule/tasks/{task_id}")
def update_schedule_task(project_name: str, task_id: str, body: ScheduleTaskUpdateRequest):
    """Update a schedule task."""
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    task = schedule_service.update_task(project_name, task_id, updates)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.delete("/api/projects/{project_name}/schedule/tasks/{task_id}")
def delete_schedule_task(project_name: str, task_id: str):
    """Delete a schedule task."""
    success = schedule_service.delete_task(project_name, task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"success": True}


@app.put("/api/projects/{project_name}/schedule/tasks/reorder")
def reorder_schedule_tasks(project_name: str, body: ScheduleReorderRequest):
    """Reorder schedule tasks."""
    return schedule_service.reorder_tasks(project_name, body.ordered_ids)


@app.post("/api/projects/{project_name}/schedule/milestones")
def create_milestone(project_name: str, body: MilestoneCreateRequest):
    """Create a new milestone."""
    return schedule_service.create_milestone(project_name, body.model_dump())


@app.put("/api/projects/{project_name}/schedule/milestones/{ms_id}")
def update_milestone(project_name: str, ms_id: str, body: MilestoneUpdateRequest):
    """Update a milestone."""
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    ms = schedule_service.update_milestone(project_name, ms_id, updates)
    if ms is None:
        raise HTTPException(status_code=404, detail="Milestone not found")
    return ms


@app.delete("/api/projects/{project_name}/schedule/milestones/{ms_id}")
def delete_milestone(project_name: str, ms_id: str):
    """Delete a milestone."""
    success = schedule_service.delete_milestone(project_name, ms_id)
    if not success:
        raise HTTPException(status_code=404, detail="Milestone not found")
    return {"success": True}


# --- Download project ---

@app.get("/api/projects/{project_name}/download")
def download_project(project_name: str):
    """Download a project as a zip file."""
    import shutil
    import tempfile

    project_path = scanner_service._find_project_path(project_name)
    if project_path is None:
        raise HTTPException(status_code=404, detail="Project not found")

    # Create temp zip
    tmp_dir = tempfile.mkdtemp()
    zip_base = os.path.join(tmp_dir, project_name)

    try:
        shutil.make_archive(
            zip_base, "zip", str(project_path.parent), project_name
        )
        zip_path = f"{zip_base}.zip"
        return FileResponse(
            zip_path,
            media_type="application/zip",
            filename=f"{project_name}.zip",
        )
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Failed to create archive: {e}")


# --- People endpoints ---

class PersonCreateRequest(BaseModel):
    name: str
    name_ko: str = ""
    role: str = ""
    affiliation: str = ""
    email: str = ""
    expertise: list[str] = []
    relationship: str = ""
    notes: str = ""
    projects: list[str] = []


class PersonUpdateRequest(BaseModel):
    name: str | None = None
    name_ko: str | None = None
    role: str | None = None
    affiliation: str | None = None
    email: str | None = None
    expertise: list[str] | None = None
    relationship: str | None = None
    notes: str | None = None
    projects: list[str] | None = None


@app.get("/api/people/search")
def search_people(q: str = ""):
    """Search people by name, affiliation, or expertise."""
    results = people_service.search_people(q)
    return {"people": results}


@app.get("/api/people")
def list_people():
    """List all people."""
    people = people_service.list_people()
    return {"people": people}


@app.get("/api/people/{person_id}")
def get_person(person_id: str):
    """Get a single person by ID."""
    person = people_service.get_person(person_id)
    if person is None:
        raise HTTPException(status_code=404, detail="Person not found")
    return person


@app.post("/api/people")
def create_person(body: PersonCreateRequest):
    """Create a new person."""
    person = people_service.create_person(body.model_dump())
    return person


@app.put("/api/people/{person_id}")
def update_person(person_id: str, body: PersonUpdateRequest):
    """Update a person."""
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    person = people_service.update_person(person_id, data)
    if person is None:
        raise HTTPException(status_code=404, detail="Person not found")
    return person


@app.delete("/api/people/{person_id}")
def delete_person(person_id: str):
    """Delete a person."""
    person = people_service.delete_person(person_id)
    if person is None:
        raise HTTPException(status_code=404, detail="Person not found")
    return {"success": True, "deleted": person}
