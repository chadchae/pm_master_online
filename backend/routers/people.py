"""People management endpoints."""

import os
import re
from pathlib import Path
from urllib.parse import unquote

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel

from services import people_service

router = APIRouter(prefix="/api/people", tags=["people"])

PEOPLE_PHOTOS_DIR = Path(os.environ.get("PROJECTS_ROOT", os.path.expanduser("~/Projects"))) / "_people" / "photos"


class PersonCreateRequest(BaseModel):
    name: str
    alias: str = ""
    role: str = ""
    affiliation: str = ""
    industry: str = ""
    email: str = ""
    expertise: list[str] = []
    relationship: str = ""
    hierarchy: str = ""
    importance: int = 0
    closeness: int = 0
    notes: str = ""
    projects: list[str] = []
    connections: list[str] = []


class PersonUpdateRequest(BaseModel):
    name: str | None = None
    alias: str | None = None
    role: str | None = None
    affiliation: str | None = None
    industry: str | None = None
    email: str | None = None
    expertise: list[str] | None = None
    relationship: str | None = None
    hierarchy: str | None = None
    importance: int | None = None
    closeness: int | None = None
    notes: str | None = None
    projects: list[str] | None = None
    connections: list[str] | None = None


@router.get("/search")
def search_people(q: str = ""):
    """Search people by name, affiliation, or expertise."""
    results = people_service.search_people(q)
    return {"people": results}


@router.get("")
def list_people():
    """List all people."""
    people = people_service.list_people()
    return {"people": people}


@router.get("/network")
def get_people_network(exclude_self: bool = True, edge_source: str = "both"):
    """Extract ego network data: nodes and edges from people connections + co-projects.

    edge_source: "connections" | "coproject" | "both"
    Returns nodes (people) and edges (source-target pairs with weights).
    Ego (self) node is removed by default.
    """
    people = people_service.list_people()

    # Find self person
    self_id = ""
    for p in people:
        if p.get("relationship") == "self":
            self_id = p["id"]
            break

    # Build id->person map
    id_map = {p["id"]: p for p in people}

    # Collect all source-target pairs
    edge_counts: dict[str, int] = {}  # "id1|id2" -> weight

    def edge_key(a: str, b: str) -> str:
        return "|".join(sorted([a, b]))

    # Source 1: direct connections
    if edge_source in ("connections", "both"):
        for p in people:
            pid = p["id"]
            for cid in p.get("connections", []):
                if cid in id_map and cid != pid:
                    key = edge_key(pid, cid)
                    edge_counts[key] = edge_counts.get(key, 0) + 1

    # Source 2: co-project links
    if edge_source in ("coproject", "both"):
        proj_members: dict[str, list[str]] = {}
        for p in people:
            for proj in p.get("projects", []):
                if proj not in proj_members:
                    proj_members[proj] = []
                proj_members[proj].append(p["id"])

        for proj, members in proj_members.items():
            for i in range(len(members)):
                for j in range(i + 1, len(members)):
                    key = edge_key(members[i], members[j])
                    edge_counts[key] = edge_counts.get(key, 0) + 1

    # Remove self if requested
    filtered_people = [p for p in people if not (exclude_self and p["id"] == self_id)]
    filtered_ids = {p["id"] for p in filtered_people}

    # Build nodes
    nodes = []
    for p in filtered_people:
        degree = sum(1 for key in edge_counts
                     if p["id"] in key.split("|")
                     and all(pid in filtered_ids for pid in key.split("|")))
        nodes.append({
            "id": p["id"],
            "name": p.get("alias") or p["name"],
            "fullName": p["name"],
            "photo": p.get("photo", ""),
            "importance": p.get("importance", 0),
            "closeness": p.get("closeness", 0),
            "relationship": p.get("relationship", ""),
            "degree": degree,
        })

    # Build edges (only between filtered nodes)
    edges = []
    for key, weight in edge_counts.items():
        source, target = key.split("|")
        if source in filtered_ids and target in filtered_ids and source != target:
            edges.append({
                "source": source,
                "target": target,
                "weight": weight,
            })

    return {
        "nodes": nodes,
        "edges": edges,
        "selfId": self_id,
        "totalPeople": len(people),
        "totalEdges": len(edges),
    }


@router.get("/{person_id}")
def get_person(person_id: str):
    """Get a single person by ID."""
    person = people_service.get_person(person_id)
    if person is None:
        raise HTTPException(status_code=404, detail="Person not found")
    return person


@router.post("")
def create_person(body: PersonCreateRequest):
    """Create a new person."""
    person = people_service.create_person(body.model_dump())
    return person


@router.put("/{person_id}")
def update_person(person_id: str, body: PersonUpdateRequest):
    """Update a person."""
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    person = people_service.update_person(person_id, data)
    if person is None:
        raise HTTPException(status_code=404, detail="Person not found")
    return person


@router.delete("/{person_id}")
def delete_person(person_id: str):
    """Delete a person."""
    person = people_service.delete_person(person_id)
    if person is None:
        raise HTTPException(status_code=404, detail="Person not found")
    return {"success": True, "deleted": person}


@router.post("/sync-projects")
def sync_projects_to_people():
    """Sync project related_people to people's projects list."""
    people_service.sync_projects_to_people()
    return {"success": True}


# --- People photo endpoints ---

@router.post("/{person_id}/photo")
async def upload_person_photo(person_id: str, file: UploadFile = File(...)):
    """Upload a photo for a person. Saves as {person_name}.{ext}."""
    PEOPLE_PHOTOS_DIR.mkdir(parents=True, exist_ok=True)
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename else "png"
    if ext not in ("png", "jpg", "jpeg", "gif", "webp"):
        raise HTTPException(status_code=400, detail="Invalid image format")

    # Get person name for filename
    person = people_service.get_person(person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    # Slugify person name for safe filename
    slug = person["name"].strip()
    slug = re.sub(r'[<>:"/\\|?*]', '', slug)  # remove unsafe chars
    if not slug:
        slug = person_id

    # Remove old photos for this person (by id or name)
    for old in PEOPLE_PHOTOS_DIR.glob(f"{person_id}.*"):
        old.unlink()
    for old in PEOPLE_PHOTOS_DIR.glob(f"{slug}.*"):
        old.unlink()

    photo_filename = f"{slug}.{ext}"
    filepath = PEOPLE_PHOTOS_DIR / photo_filename
    content = await file.read()
    filepath.write_bytes(content)

    # Update person's photo field
    people_service.update_person(person_id, {"photo": photo_filename})

    return {"success": True, "photo": photo_filename}


@router.delete("/{person_id}/photo")
def delete_person_photo(person_id: str):
    """Delete a person's photo."""
    person = people_service.get_person(person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    photo = person.get("photo", "")
    if photo:
        filepath = PEOPLE_PHOTOS_DIR / photo
        if filepath.exists():
            filepath.unlink()
        people_service.update_person(person_id, {"photo": ""})
    return {"success": True}


@router.get("/photos/{filename:path}")
def serve_person_photo(filename: str):
    """Serve a person's photo."""
    decoded = unquote(filename)
    filepath = PEOPLE_PHOTOS_DIR / decoded
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Photo not found")
    return FileResponse(filepath)
