"""Common folders, quick notes, and project memos endpoints."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services import common_folder_service, document_service

router = APIRouter(prefix="/api", tags=["common"])


# --- Common folders endpoints ---

@router.get("/common/{folder_type}")
def list_common_files(folder_type: str, subpath: str = ""):
    """List files in a common folder (_notes, _learning, etc.)."""
    if folder_type not in common_folder_service.FOLDER_TYPE_MAP:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid folder type. Must be one of: {list(common_folder_service.FOLDER_TYPE_MAP.keys())}",
        )
    files = common_folder_service.list_files_at(folder_type, subpath)
    return {"folder_type": folder_type, "files": files}


@router.get("/common/{folder_type}/{filename:path}")
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


@router.put("/common/{folder_type}/{filename:path}")
def save_common_file(folder_type: str, filename: str, body: SaveFileRequest):
    """Save/update a file in a common folder."""
    if folder_type not in common_folder_service.FOLDER_TYPE_MAP:
        raise HTTPException(status_code=400, detail="Invalid folder type")
    result = common_folder_service.write_file(folder_type, filename, body.content)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.delete("/common/{folder_type}/{filename:path}")
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


@router.post("/common/{folder_type}/folders")
def create_common_subfolder(folder_type: str, body: SubfolderRequest):
    """Create a subfolder in a common folder."""
    if folder_type not in common_folder_service.FOLDER_TYPE_MAP:
        raise HTTPException(status_code=400, detail="Invalid folder type")
    result = common_folder_service.create_subfolder(folder_type, body.folder_name)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.delete("/common/{folder_type}/folders/{folder_name}")
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


@router.get("/quicknotes")
def list_quicknotes():
    """List quick notes from _notes/_temp/."""
    notes = common_folder_service.list_quicknotes()
    return {"notes": notes}


@router.post("/quicknotes")
def create_quicknote(body: QuickNoteRequest):
    """Create a new quick note."""
    result = common_folder_service.create_quicknote(body.title, body.content)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.get("/quicknotes/{filename}")
def read_quicknote(filename: str):
    """Read a quick note's content."""
    result = common_folder_service.read_quicknote(filename)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    return result


class QuickNoteUpdateRequest(BaseModel):
    content: str


@router.put("/quicknotes/{filename}")
def update_quicknote(filename: str, body: QuickNoteUpdateRequest):
    """Update a quick note's content."""
    result = common_folder_service.update_quicknote(filename, body.content)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.delete("/quicknotes/{filename}")
def delete_quicknote(filename: str):
    """Delete a quick note."""
    result = common_folder_service.delete_quicknote(filename)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.post("/quicknotes/move")
def move_quicknote(body: MoveNoteRequest):
    """Move a quick note to a permanent notes file (append)."""
    result = common_folder_service.move_quicknote(body.filename, body.target_file)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


class MoveToProjectRequest(BaseModel):
    filename: str
    project_name: str
    target_folder: str = ""


@router.post("/quicknotes/move-to-project")
def move_quicknote_to_project(body: MoveToProjectRequest):
    """Move a quick note to a project's docs/ folder."""
    result = document_service.move_quicknote_to_project(
        body.filename, body.project_name, body.target_folder
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


# --- Project Memo endpoints (separate from quick notes) ---

class SaveDocRequest(BaseModel):
    content: str


@router.get("/project-memos")
def list_project_memos():
    """List all project memos."""
    memos = common_folder_service.list_project_memos()
    return {"notes": memos}


@router.post("/project-memos")
def create_project_memo(body: QuickNoteRequest):
    """Create a new project memo."""
    result = common_folder_service.create_project_memo(body.title, body.content)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.get("/project-memos/{filename}")
def read_project_memo(filename: str):
    """Read a project memo."""
    result = common_folder_service.read_project_memo(filename)
    if not result.get("success", False):
        raise HTTPException(status_code=404, detail=result.get("message", "Not found"))
    return result


@router.put("/project-memos/{filename}")
def update_project_memo(filename: str, body: SaveDocRequest):
    """Update a project memo."""
    result = common_folder_service.update_project_memo(filename, body.content)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.delete("/project-memos/{filename}")
def delete_project_memo(filename: str):
    """Delete a project memo."""
    result = common_folder_service.delete_project_memo(filename)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result
