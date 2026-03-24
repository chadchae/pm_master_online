"""Plans endpoints — CRUD for user plans stored in data/plans.json."""

import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/plans", tags=["plans"])

PLANS_FILE = Path(__file__).resolve().parent.parent / "data" / "plans.json"


def _load() -> list[dict]:
    if not PLANS_FILE.exists():
        return []
    try:
        return json.loads(PLANS_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []


def _save(plans: list[dict]) -> None:
    PLANS_FILE.parent.mkdir(parents=True, exist_ok=True)
    PLANS_FILE.write_text(json.dumps(plans, ensure_ascii=False, indent=2), encoding="utf-8")


# ── Pydantic models ──────────────────────────────────────────────────────────

class MandalartData(BaseModel):
    center: str = ""
    themes: list[str] = []
    actions: list[list[str]] = []


class PlanNode(BaseModel):
    id: str
    type: str
    title: str
    x: float
    y: float
    done: bool = False


class PlanEdge(BaseModel):
    id: str
    fromId: str
    fromPort: str = "right"
    toId: str
    toPort: str = "left"
    label: str = ""


class PlanBody(BaseModel):
    id: str
    title: str
    stage: str = "idea"
    description: str = ""
    relatedProjects: list[str] = []
    relatedPeople: list[str] = []
    relatedTodos: list[str] = []
    relatedNotes: list[str] = []
    relatedLearning: list[str] = []
    relatedIssues: list[str] = []
    relatedSchedule: list[str] = []
    createdAt: str = ""
    createdAtISO: str = ""
    planNodes: list[PlanNode] = []
    planEdges: list[PlanEdge] = []
    mandalart: MandalartData = MandalartData()
    horizon: str = ""
    horizonPeriod: str = ""
    importance: str = ""
    severity: str = ""
    urgency: str = ""
    planType: str = ""
    startDate: str = ""
    targetEndDate: str = ""
    actualEndDate: str = ""
    progress: int = 0


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("")
def list_plans() -> dict:
    """Return all plans."""
    return {"plans": _load()}


@router.post("")
def create_plan(body: PlanBody) -> dict:
    """Create a new plan."""
    plans = _load()
    if any(p["id"] == body.id for p in plans):
        raise HTTPException(status_code=409, detail="Plan with this id already exists")
    plans.insert(0, body.model_dump())
    _save(plans)
    return body.model_dump()


@router.put("/{plan_id}")
def update_plan(plan_id: str, body: PlanBody) -> dict:
    """Replace a plan by id."""
    plans = _load()
    idx = next((i for i, p in enumerate(plans) if p["id"] == plan_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Plan not found")
    plans[idx] = body.model_dump()
    _save(plans)
    return plans[idx]


@router.delete("/{plan_id}")
def delete_plan(plan_id: str) -> dict:
    """Delete a plan by id."""
    plans = _load()
    new_plans = [p for p in plans if p["id"] != plan_id]
    if len(new_plans) == len(plans):
        raise HTTPException(status_code=404, detail="Plan not found")
    _save(new_plans)
    return {"success": True}
