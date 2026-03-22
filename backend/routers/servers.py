"""Server status and control endpoints."""

from pathlib import Path

from fastapi import APIRouter, HTTPException

from services import server_service

router = APIRouter(prefix="/api/servers", tags=["servers"])


@router.get("/{project_name}/logs")
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


@router.get("/status")
def server_status():
    """Scan all projects for running servers."""
    statuses = server_service.get_server_status()
    return {"servers": statuses}


@router.post("/{project_name}/start")
async def start_server(project_name: str):
    """Start a project's dev server."""
    result = await server_service.run_server_command(project_name, "start")
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.post("/{project_name}/stop")
async def stop_server(project_name: str):
    """Stop a project's dev server."""
    result = await server_service.run_server_command(project_name, "stop")
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.post("/{project_name}/restart")
async def restart_server(project_name: str):
    """Restart a project's dev server."""
    result = await server_service.run_server_command(project_name, "restart")
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.post("/start-all")
async def start_all_servers():
    """Start all stopped servers."""
    results = []
    statuses = server_service.get_server_status()
    for s in statuses:
        if not s.get("running"):
            r = await server_service.run_server_command(s["project_name"], "start")
            results.append({"project": s["project_name"], **r})
    return {"results": results}


@router.post("/stop-all")
async def stop_all_servers():
    """Stop all running servers."""
    results = []
    statuses = server_service.get_server_status()
    for s in statuses:
        if s.get("running"):
            r = await server_service.run_server_command(s["project_name"], "stop")
            results.append({"project": s["project_name"], **r})
    return {"results": results}


@router.post("/restart-all")
async def restart_all_servers():
    """Restart all servers."""
    results = []
    statuses = server_service.get_server_status()
    for s in statuses:
        r = await server_service.run_server_command(s["project_name"], "restart")
        results.append({"project": s["project_name"], **r})
    return {"results": results}
