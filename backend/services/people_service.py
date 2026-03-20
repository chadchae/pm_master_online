"""People management service with JSON file storage."""

import json
import uuid
from datetime import date
from pathlib import Path
from typing import Any

DATA_FILE = Path(__file__).parent.parent / "data" / "people.json"

# Default data to seed on first run
_DEFAULT_PEOPLE = [
    {
        "id": str(uuid.uuid4()),
        "name": "Chad (Chungil Chae)",
        "name_ko": "\ucc44\ucda9\uc77c",
        "role": "Assistant Professor",
        "affiliation": "Wenzhou-Kean University",
        "email": "",
        "expertise": ["HRD", "People Analytics", "Bibliometrics", "AI-Assisted Research"],
        "relationship": "self",
        "notes": "Project owner. CBPM department.",
        "projects": [],
        "connections": [],
        "created_at": str(date.today()),
        "updated_at": str(date.today()),
    }
]


def _load_people() -> list[dict[str, Any]]:
    """Load people from JSON file, creating default if not exists."""
    if not DATA_FILE.exists():
        DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
        _save_people(_DEFAULT_PEOPLE)
        return list(_DEFAULT_PEOPLE)
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_people(people: list[dict[str, Any]]) -> None:
    """Save people list to JSON file."""
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(people, f, ensure_ascii=False, indent=2)


def list_people() -> list[dict[str, Any]]:
    """Return all people."""
    return _load_people()


def get_person(person_id: str) -> dict[str, Any] | None:
    """Get a single person by ID."""
    people = _load_people()
    for person in people:
        if person["id"] == person_id:
            return person
    return None


def create_person(data: dict[str, Any]) -> dict[str, Any]:
    """Create a new person with auto-generated UUID."""
    people = _load_people()
    today = str(date.today())
    person = {
        "id": str(uuid.uuid4()),
        "name": data.get("name", ""),
        "name_ko": data.get("name_ko", ""),
        "role": data.get("role", ""),
        "affiliation": data.get("affiliation", ""),
        "email": data.get("email", ""),
        "expertise": data.get("expertise", []),
        "relationship": data.get("relationship", ""),
        "hierarchy": data.get("hierarchy", ""),
        "notes": data.get("notes", ""),
        "projects": data.get("projects", []),
        "connections": data.get("connections", []),
        "created_at": today,
        "updated_at": today,
    }
    people.append(person)
    _save_people(people)
    return person


def update_person(person_id: str, data: dict[str, Any]) -> dict[str, Any] | None:
    """Update a person by ID. Returns updated person or None."""
    people = _load_people()
    for i, person in enumerate(people):
        if person["id"] == person_id:
            # Update only provided fields, preserve id and created_at
            for key in ("name", "name_ko", "role", "affiliation", "email",
                        "expertise", "relationship", "hierarchy", "notes", "projects", "connections"):
                if key in data:
                    person[key] = data[key]
            person["updated_at"] = str(date.today())
            people[i] = person
            _save_people(people)
            return person
    return None


def delete_person(person_id: str) -> dict[str, Any] | None:
    """Delete a person by ID. Returns deleted person or None."""
    people = _load_people()
    for i, person in enumerate(people):
        if person["id"] == person_id:
            deleted = people.pop(i)
            _save_people(people)
            return deleted
    return None


def search_people(query: str) -> list[dict[str, Any]]:
    """Search people by name, name_ko, affiliation, or expertise."""
    if not query:
        return _load_people()
    q = query.lower()
    people = _load_people()
    results = []
    for person in people:
        if (
            q in person.get("name", "").lower()
            or q in person.get("name_ko", "").lower()
            or q in person.get("affiliation", "").lower()
            or q in person.get("role", "").lower()
            or q in person.get("relationship", "").lower()
            or any(q in exp.lower() for exp in person.get("expertise", []))
        ):
            results.append(person)
    return results
