"""People management service with filesystem-based MD+YAML storage.

Each person is stored as a markdown file in ~/Projects/_people/{slug}.md
with YAML frontmatter for metadata and markdown body for notes.
Changes in the app create/update files, and manual file creation is picked up by scan.
"""

import os
import re
import uuid
import yaml
from datetime import date
from pathlib import Path
from typing import Any

PROJECTS_ROOT = Path(os.environ.get("PROJECTS_ROOT", os.path.expanduser("~/Projects")))
PEOPLE_DIR = PROJECTS_ROOT / "_people"

# Fields stored in YAML frontmatter
META_FIELDS = [
    "id", "name", "alias", "role", "affiliation", "industry", "email",
    "expertise", "relationship", "hierarchy", "importance", "closeness",
    "projects", "connections", "photo", "created_at", "updated_at",
]


def _slugify(name: str) -> str:
    """Convert a name to a safe filename slug."""
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s]+", "-", slug)
    return slug or "unnamed"


def _parse_person_file(filepath: Path) -> dict[str, Any] | None:
    """Parse a person .md file with YAML frontmatter."""
    try:
        content = filepath.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return None

    # Parse YAML frontmatter
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            try:
                meta = yaml.safe_load(parts[1]) or {}
            except yaml.YAMLError:
                meta = {}
            body = parts[2].strip()
        else:
            meta = {}
            body = content
    else:
        meta = {}
        body = content.strip()

    # Strip leading # title from body to extract notes
    body_lines = body.split("\n") if body else []
    if body_lines and body_lines[0].startswith("# "):
        body_lines = body_lines[1:]
    notes_text = "\n".join(body_lines).strip()

    # Build person dict from meta
    # Resolve person ID for photo auto-detection
    person_id = meta.get("id", str(uuid.uuid5(uuid.NAMESPACE_URL, str(filepath))))

    # Auto-detect photo from photos directory (by id or name)
    photo = meta.get("photo", "")
    if not photo:
        photos_dir = PEOPLE_DIR / "photos"
        person_name = meta.get("name", filepath.stem)
        if photos_dir.exists():
            # Search by person_id, then by name
            for search_key in (person_id, person_name):
                for ext in ("png", "jpg", "jpeg", "gif", "webp"):
                    candidate = photos_dir / f"{search_key}.{ext}"
                    if candidate.exists():
                        photo = candidate.name
                        break
                if photo:
                    break

    # Build person dict — read ALL YAML keys dynamically
    # Defaults for known fields
    defaults: dict[str, Any] = {
        "id": person_id,
        "name": filepath.stem,
        "alias": "",
        "role": "",
        "affiliation": "",
        "industry": "",
        "email": "",
        "expertise": [],
        "relationship": "",
        "hierarchy": "",
        "importance": 0,
        "closeness": 0,
        "projects": [],
        "connections": [],
        "photo": "",
        "created_at": "",
        "updated_at": "",
    }

    # Start with defaults, overlay with ALL meta keys (dynamic)
    person: dict[str, Any] = {**defaults}
    for key, val in meta.items():
        person[key] = val

    # Override specific fields
    person["id"] = person_id
    person["notes"] = notes_text if notes_text else meta.get("notes", "")
    person["photo"] = photo
    person["_filepath"] = str(filepath)

    # Ensure lists
    if isinstance(person["expertise"], str):
        person["expertise"] = [s.strip() for s in person["expertise"].split(",") if s.strip()]
    if isinstance(person["projects"], str):
        person["projects"] = [s.strip() for s in person["projects"].split(",") if s.strip()]
    if isinstance(person["connections"], str):
        person["connections"] = [s.strip() for s in person["connections"].split(",") if s.strip()]

    return person


def _write_person_file(person: dict[str, Any], filepath: Path | None = None) -> Path:
    """Write a person to a .md file with YAML frontmatter."""
    PEOPLE_DIR.mkdir(parents=True, exist_ok=True)

    if filepath is None:
        slug = _slugify(person.get("name", "unnamed"))
        filepath = PEOPLE_DIR / f"{slug}.md"
        # Avoid collision
        counter = 1
        while filepath.exists():
            filepath = PEOPLE_DIR / f"{slug}-{counter}.md"
            counter += 1

    # Build YAML frontmatter — write known META_FIELDS first, then any extra keys
    meta = {}
    # Known fields in order
    for field in META_FIELDS:
        val = person.get(field)
        if val is not None and val != "" and val != [] and val != 0:
            meta[field] = val
        elif field in ("id", "name"):
            meta[field] = val or ""
    # Extra dynamic keys (from MD file, not in META_FIELDS)
    skip_keys = set(META_FIELDS) | {"notes", "_filepath"}
    for key, val in person.items():
        if key not in skip_keys and val is not None and val != "" and val != [] and val != 0:
            meta[key] = val

    # Notes go to body
    notes = person.get("notes", "")

    yaml_str = yaml.dump(meta, allow_unicode=True, default_flow_style=False, sort_keys=False)
    name = person.get("name", "Unnamed")
    warning = "# WARNING: Do not manually edit metadata fields below.\n# Use the PM Master app to modify. Only notes (body) can be edited locally.\n"
    content = f"---\n{warning}{yaml_str}---\n\n# {name}\n\n{notes}\n"

    filepath.write_text(content, encoding="utf-8")
    return filepath


def _update_template() -> None:
    """Auto-generate/update _template_people.md with current META_FIELDS.

    Only rewrites if META_FIELDS have changed (compares field list in file).
    """
    template_path = PEOPLE_DIR / "_template_people.md"

    # Build expected template content
    field_defaults: dict[str, str] = {
        "id": "(auto-generated)",
        "name": "Full Name (required)",
        "alias": "Nickname or alternate name",
        "role": "e.g. Professor, Researcher",
        "affiliation": "University or Organization",
        "industry": "e.g. Education, IT, Healthcare",
        "email": "email@example.com",
        "expertise": "skill1, skill2, skill3",
        "relationship": "self / co-author / advisor / advisee / student / colleague / friend / external",
        "hierarchy": "선배 / 동기 / 후배 / ???",
        "importance": "1-5",
        "closeness": "1-5",
        "projects": "",
        "connections": "",
        "photo": "(auto-detected from photos/ folder)",
        "created_at": "(auto-generated)",
        "updated_at": "(auto-generated)",
    }

    yaml_lines = []
    for field in META_FIELDS:
        hint = field_defaults.get(field, "")
        yaml_lines.append(f"{field}: {hint}")

    expected_fields = ",".join(META_FIELDS)
    marker = f"# META_FIELDS: {expected_fields}"

    # Check if existing template matches current fields
    if template_path.exists():
        existing = template_path.read_text(encoding="utf-8")
        if marker in existing:
            return  # Template is up-to-date

    # Write/update template
    content = f"""---
# TEMPLATE: Copy this file and rename to create a new person.
# Remove lines you don't need. 'name' is required.
# Do NOT modify this template file directly — it is auto-generated.
{marker}
{chr(10).join(yaml_lines)}
---

# Person Name

Notes about this person go here.
"""
    template_path.write_text(content, encoding="utf-8")


def list_people() -> list[dict[str, Any]]:
    """Scan _people/ directory and return all people."""
    if not PEOPLE_DIR.exists():
        PEOPLE_DIR.mkdir(parents=True, exist_ok=True)
        # Seed default self
        _seed_default()
        return list_people()

    people = []
    for f in sorted(PEOPLE_DIR.iterdir()):
        if f.suffix == ".md" and not f.name.startswith(".") and not f.name.startswith("_"):
            person = _parse_person_file(f)
            if person:
                people.append(person)

    # Auto-generate/update template file
    _update_template()

    return people


def _seed_default() -> None:
    """Create default self person file."""
    person = {
        "id": str(uuid.uuid4()),
        "name": "Chad (Chungil Chae)",
        "alias": "채충일",
        "role": "Assistant Professor",
        "affiliation": "Wenzhou-Kean University",
        "industry": "Education",
        "email": "chadchae@gmail.com",
        "expertise": ["HRD", "People Analytics", "Bibliometrics", "AI-Assisted Research"],
        "relationship": "self",
        "hierarchy": "",
        "importance": 5,
        "closeness": 5,
        "notes": "Project owner. CBPM department.",
        "projects": [],
        "connections": [],
        "created_at": str(date.today()),
        "updated_at": str(date.today()),
    }
    _write_person_file(person)


def get_person(person_id: str) -> dict[str, Any] | None:
    """Get a single person by ID."""
    for person in list_people():
        if person["id"] == person_id:
            return person
    return None


def create_person(data: dict[str, Any]) -> dict[str, Any]:
    """Create a new person file."""
    today = str(date.today())
    person = {
        "id": str(uuid.uuid4()),
        "name": data.get("name", ""),
        "alias": data.get("alias", ""),
        "role": data.get("role", ""),
        "affiliation": data.get("affiliation", ""),
        "industry": data.get("industry", ""),
        "email": data.get("email", ""),
        "expertise": data.get("expertise", []),
        "relationship": data.get("relationship", ""),
        "hierarchy": data.get("hierarchy", ""),
        "importance": data.get("importance", 0),
        "closeness": data.get("closeness", 0),
        "notes": data.get("notes", ""),
        "projects": data.get("projects", []),
        "connections": data.get("connections", []),
        "photo": data.get("photo", ""),
        "created_at": today,
        "updated_at": today,
    }
    filepath = _write_person_file(person)
    person["_filepath"] = str(filepath)
    return person


def update_person(person_id: str, data: dict[str, Any]) -> dict[str, Any] | None:
    """Update a person by ID. Finds the file, updates, and rewrites.
    If name changes, updates all project references.
    """
    for person in list_people():
        if person["id"] == person_id:
            filepath = Path(person.get("_filepath", ""))
            if not filepath.exists():
                return None

            old_name = person["name"]
            old_alias = person.get("alias", "")

            # Update any provided fields (dynamic — accepts new keys too)
            for key, val in data.items():
                if key not in ("id", "created_at", "_filepath"):
                    person[key] = val
            person["updated_at"] = str(date.today())

            new_name = person["name"]

            # If name changed, update all project references
            if old_name != new_name:
                _rename_person_in_all_projects(old_name, old_alias, new_name)

            # Rewrite file
            _write_person_file(person, filepath)
            return person
    return None


def delete_person(person_id: str) -> dict[str, Any] | None:
    """Delete a person by removing the file and cleaning up all project references."""
    for person in list_people():
        if person["id"] == person_id:
            person_name = person["name"]
            person_alias = person.get("alias", "")

            # Remove file
            filepath = Path(person.get("_filepath", ""))
            if filepath.exists():
                filepath.unlink()

            # Remove from all projects' related_people
            _remove_person_from_all_projects(person_name, person_alias)

            return person
    return None


def _remove_person_from_all_projects(person_name: str, person_alias: str = "") -> None:
    """Remove a person from all projects' related_people."""
    from services.scanner_service import scan_projects, update_metadata
    for proj in scan_projects():
        related = proj.get("metadata", {}).get("related_people", "")
        if not related:
            continue
        names = [n.strip() for n in related.split(",") if n.strip()]
        new_names = [n for n in names if n != person_name and n != person_alias]
        if len(new_names) != len(names):
            update_metadata(proj["name"], {"related_people": ", ".join(new_names)})


def _rename_person_in_all_projects(old_name: str, old_alias: str, new_name: str) -> None:
    """Rename a person in all projects' related_people."""
    from services.scanner_service import scan_projects, update_metadata
    for proj in scan_projects():
        related = proj.get("metadata", {}).get("related_people", "")
        if not related:
            continue
        names = [n.strip() for n in related.split(",") if n.strip()]
        changed = False
        new_names = []
        for n in names:
            if n == old_name or n == old_alias:
                if new_name not in new_names:
                    new_names.append(new_name)
                changed = True
            else:
                new_names.append(n)
        if changed:
            update_metadata(proj["name"], {"related_people": ", ".join(new_names)})


def sync_projects_to_people() -> None:
    """Sync project related_people ↔ person.projects (bidirectional cleanup)."""
    from services.scanner_service import scan_projects
    projects = scan_projects()
    people = list_people()

    # Build map: person_name → person (name, alias, and name parts)
    name_map: dict[str, dict[str, Any]] = {}
    for p in people:
        name_map[p["name"]] = p
        if p.get("alias"):
            name_map[p["alias"]] = p
        # Also map parenthetical names: "Chad (Chungil Chae)" → match "Chad" or "Chungil Chae"
        import re
        paren = re.findall(r"\(([^)]+)\)", p["name"])
        for alias in paren:
            name_map[alias.strip()] = p
        # Map name without parentheses
        base_name = re.sub(r"\s*\([^)]*\)\s*", "", p["name"]).strip()
        if base_name and base_name != p["name"]:
            name_map[base_name] = p

    # For each project, check related_people
    from services.scanner_service import update_metadata
    for proj in projects:
        related = proj.get("metadata", {}).get("related_people", "")
        if not related:
            continue
        related_names = [n.strip() for n in related.split(",") if n.strip()]
        proj_label = proj.get("metadata", {}).get("label", proj["name"])

        # Track if any names need updating in the project
        updated_names = []
        names_changed = False

        for rname in related_names:
            person = name_map.get(rname)
            if person:
                canonical_name = person["name"]

                # If matched by alias/old name, update to canonical name
                if rname != canonical_name:
                    updated_names.append(canonical_name)
                    names_changed = True
                else:
                    updated_names.append(rname)

                # Update person's project list
                if proj_label not in person.get("projects", []):
                    person_projects = person.get("projects", [])
                    person_projects.append(proj_label)
                    update_person(person["id"], {"projects": person_projects})
            else:
                # Keep unmatched names as-is (not registered)
                updated_names.append(rname)

        # Update project's related_people if names changed
        if names_changed:
            # Deduplicate
            seen = set()
            deduped = []
            for n in updated_names:
                if n not in seen:
                    seen.add(n)
                    deduped.append(n)
            update_metadata(proj["name"], {"related_people": ", ".join(deduped)})

    # NOTE: Intentionally NO reverse cleanup.
    # Removing someone from a project's related_people does NOT remove
    # the project from the person's projects list. This is by design.


def add_project_to_person(person_name: str, project_label: str) -> None:
    """Add a project to a person's projects list."""
    for person in list_people():
        if person["name"] == person_name or person.get("alias") == person_name:
            projects = person.get("projects", [])
            if project_label not in projects:
                projects.append(project_label)
                update_person(person["id"], {"projects": projects})
            return


def add_person_to_project(person_name: str, project_name: str) -> None:
    """Add a person to a project's related_people metadata."""
    from services.scanner_service import scan_projects, update_metadata
    projects = scan_projects()
    for proj in projects:
        if proj["name"] == project_name or proj.get("metadata", {}).get("label") == project_name:
            related = proj.get("metadata", {}).get("related_people", "")
            existing = [n.strip() for n in related.split(",") if n.strip()]
            if person_name not in existing:
                existing.append(person_name)
                update_metadata(proj["name"], {"related_people": ", ".join(existing)})
            return


def search_people(query: str) -> list[dict[str, Any]]:
    """Search people by name, alias, affiliation, industry, or expertise."""
    if not query:
        return list_people()
    q = query.lower()
    results = []
    for person in list_people():
        if (
            q in person.get("name", "").lower()
            or q in person.get("alias", "").lower()
            or q in person.get("affiliation", "").lower()
            or q in person.get("industry", "").lower()
            or q in person.get("role", "").lower()
            or q in person.get("relationship", "").lower()
            or any(q in exp.lower() for exp in person.get("expertise", []))
        ):
            results.append(person)
    return results
