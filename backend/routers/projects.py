"""Project CRUD, scanning, and metadata endpoints."""

import os
import shutil
import tempfile

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from services import scanner_service, project_meta_service, log_service
from services import todo_service, issue_service, subtask_service, schedule_service
from routers.deps import refresh_meta

router = APIRouter(prefix="/api", tags=["projects"])


# --- Migration endpoint ---

@router.post("/migrate/yaml-frontmatter")
def migrate_yaml_frontmatter():
    """Migrate to new docs structure: _project.yaml + 아이디어/ + 토의록/."""
    result = scanner_service.migrate_to_new_structure()
    return result


# --- Project meta snapshot endpoints ---

@router.post("/projects/{project_name}/generate-meta")
def generate_project_meta(project_name: str):
    """Regenerate _project_meta.md for a single project."""
    return project_meta_service.generate_meta(project_name)


@router.post("/projects/generate-meta-all")
def generate_all_project_meta():
    """Regenerate _project_meta.md for all projects."""
    return project_meta_service.generate_all_meta()


# --- Project scanner endpoints ---

@router.get("/projects")
def list_projects():
    """Scan and list all projects."""
    projects = scanner_service.scan_projects()
    return {"projects": projects}


@router.delete("/projects/{project_name}")
def delete_project(project_name: str):
    """Permanently delete a project folder (only from 7_discarded)."""
    result = scanner_service.delete_project(project_name)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


class RestoreProjectRequest(BaseModel):
    target_stage: str = "1_idea_stage"


@router.post("/projects/{project_name}/restore")
def restore_project(project_name: str, body: RestoreProjectRequest):
    """Restore a discarded project back to a stage."""
    result = scanner_service.move_project(project_name, "7_discarded", body.target_stage)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


class UpdateMetadataRequest(BaseModel):
    metadata: dict[str, str]


@router.put("/projects/{project_name}/metadata")
def update_metadata(project_name: str, body: UpdateMetadataRequest):
    """Update a project's metadata tags in _project.yaml."""
    result = scanner_service.update_metadata(project_name, body.metadata)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    refresh_meta(project_name)
    return result


class RenameTypeRequest(BaseModel):
    old_type: str
    new_type: str


@router.put("/projects/rename-type")
def rename_project_type(body: RenameTypeRequest):
    """Rename a project type across all projects."""
    count = scanner_service.rename_type_all(body.old_type, body.new_type)
    return {"success": True, "updated": count}


@router.delete("/projects/delete-type/{type_name}")
def delete_project_type(type_name: str):
    """Clear a project type from all projects."""
    count = scanner_service.delete_type_all(type_name)
    return {"success": True, "updated": count}


class UpdateDescriptionRequest(BaseModel):
    description: str


@router.put("/projects/{project_name}/description")
def update_description(project_name: str, body: UpdateDescriptionRequest):
    """Update a project's description in 아이디어/_아이디어노트.md."""
    result = scanner_service.update_description(project_name, body.description)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    refresh_meta(project_name)
    return result


class CreateProjectRequest(BaseModel):
    folder_name: str
    label: str = ""
    description: str = ""
    project_type: str = ""
    stage: str = "1_idea_stage"
    related_projects: str = ""


@router.post("/projects/create")
def create_project(body: CreateProjectRequest):
    """Create a new project/idea with folder and docs."""
    result = scanner_service.create_project(
        body.folder_name, body.label, body.description, body.project_type, body.stage,
        body.related_projects,
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    log_service.auto_log(body.folder_name, "create", f"Project created: {body.label or body.folder_name}")
    return result


@router.post("/projects/{project_name}/clone")
def clone_project(project_name: str):
    """Clone a project with copy- prefix and [COPY] label."""
    result = scanner_service.clone_project(project_name)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


class MoveProjectRequest(BaseModel):
    project_name: str
    from_stage: str
    to_stage: str
    instruction: str = ""


@router.post("/projects/move")
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

    log_service.auto_log(body.project_name, "milestone", f"Stage moved: {body.from_stage} → {body.to_stage}")
    refresh_meta(body.project_name)
    return result


# --- Project summary ---

@router.get("/projects/{project_name}/summary")
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
    critical_issues = len([i for i in issues_list if i.get("priority") == "critical" and i["status"] in ("open", "in_progress")])

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
            "critical": critical_issues,
        },
        "subtasks": subtask_counts,
        "schedule": schedule_service.get_summary(project_name),
    }


# --- Download project ---

@router.get("/projects/{project_name}/download")
def download_project(project_name: str):
    """Download a project as a zip file."""
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
