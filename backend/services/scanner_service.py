"""Project scanner service for discovering and managing projects."""

import os
import re
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any

import yaml

PROJECTS_ROOT = Path(os.environ.get("PROJECTS_ROOT", os.path.expanduser("~/Projects")))

# Stage folder mapping
STAGE_FOLDERS = {
    "0": "0_project_development_documents",
    "1": "1_idea_stage",
    "2": "2_initiation_stage",
    "3": "3_in_development",
    "4": "4_in_testing",
    "5": "5_completed",
    "6": "6_archived",
    "7": "7_discarded",
}

# Reverse mapping: folder name -> stage number
FOLDER_TO_STAGE: dict[str, str] = {}
for stage_num, folder_name in STAGE_FOLDERS.items():
    FOLDER_TO_STAGE[folder_name] = stage_num

# Common folders to exclude from project listing
COMMON_FOLDERS = {"_notes", "_learning", "_issues_common", "_guideline"}


def _parse_yaml_frontmatter(content: str) -> tuple[dict[str, Any], str]:
    """Parse YAML frontmatter from markdown content.

    Returns (metadata_dict, body_after_frontmatter).
    """
    if not content.startswith("---"):
        return {}, content

    lines = content.split("\n")
    end_idx = -1
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            end_idx = i
            break

    if end_idx < 0:
        return {}, content

    yaml_str = "\n".join(lines[1:end_idx])
    body = "\n".join(lines[end_idx + 1:])

    try:
        data = yaml.safe_load(yaml_str)
        if isinstance(data, dict):
            # Convert all values to strings for consistency
            metadata: dict[str, Any] = {}
            for k, v in data.items():
                if isinstance(v, list):
                    metadata[k] = v  # Keep lists (for subtasks)
                elif v is not None:
                    metadata[k] = str(v)
            return metadata, body
    except yaml.YAMLError:
        pass
    return {}, content


def _parse_idea_note(filepath: Path) -> dict[str, Any]:
    """Parse metadata from _아이디어노트.md.

    Supports YAML frontmatter (priority) and blockquote format (fallback).
    """
    metadata: dict[str, Any] = {}
    try:
        content = filepath.read_text(encoding="utf-8")

        # Try YAML frontmatter first
        yaml_meta, body = _parse_yaml_frontmatter(content)
        if yaml_meta:
            metadata = yaml_meta
            # Extract description from body: first non-empty paragraph
            for line in body.splitlines():
                stripped = line.strip()
                if stripped and not stripped.startswith("#") and stripped != "---":
                    metadata.setdefault("description", stripped)
                    break
            return metadata

        # Fallback: blockquote format
        lines = content.splitlines()
        for line in lines:
            stripped = line.strip()
            if stripped.startswith(">"):
                cleaned = stripped.lstrip(">").strip()
                match = re.match(r"^(.+?):\s*(.+)$", cleaned)
                if match:
                    key = match.group(1).strip()
                    value = match.group(2).strip()
                    metadata[key] = value

        # Extract description from ## 한 줄 요약
        desc_lines: list[str] = []
        in_desc = False
        for line in lines:
            stripped = line.strip()
            if stripped == "## 한 줄 요약":
                in_desc = True
                continue
            if in_desc:
                if stripped.startswith("##") or stripped == "---":
                    break
                if stripped:
                    desc_lines.append(stripped)
        if desc_lines:
            metadata["description"] = " ".join(desc_lines)

    except (OSError, UnicodeDecodeError):
        pass
    return metadata


def _parse_readme(project_path: Path) -> tuple[str | None, str | None]:
    """Extract description and title from README.md.

    Returns (description, title) tuple.
    Title: first # heading text.
    Description: first non-heading, non-empty paragraph after title.
    """
    readme = project_path / "README.md"
    if not readme.is_file():
        return None, None

    try:
        content = readme.read_text(encoding="utf-8")
        lines = content.splitlines()
        title = None
        desc_lines: list[str] = []
        found_title = False
        collecting_desc = False

        for line in lines:
            stripped = line.strip()
            if not found_title and stripped.startswith("# "):
                title = stripped[2:].strip()
                # Remove markdown formatting like **text** or _text_
                title = re.sub(r"[*_`]", "", title).strip()
                found_title = True
                collecting_desc = True
                continue
            if collecting_desc:
                if not stripped:
                    if desc_lines:
                        break  # End of description paragraph
                    continue
                if stripped.startswith("#") or stripped == "---":
                    break
                # Skip badge lines and links-only lines
                if stripped.startswith("![") or stripped.startswith("[!") or stripped.startswith("[!["):
                    continue
                # Blockquote description
                if stripped.startswith(">"):
                    desc_lines.append(stripped.lstrip(">").strip())
                else:
                    desc_lines.append(stripped)

        description = " ".join(desc_lines) if desc_lines else None
        return description, title
    except (OSError, UnicodeDecodeError):
        return None, None


def _parse_idea_note_title(project_path: Path) -> str | None:
    """Extract title from _아이디어노트.md first # heading."""
    idea_note = project_path / "docs" / "_아이디어노트.md"
    if not idea_note.is_file():
        return None

    try:
        content = idea_note.read_text(encoding="utf-8")
        for line in content.splitlines():
            stripped = line.strip()
            if stripped.startswith("# "):
                title = stripped[2:].strip()
                # Remove suffix like "— 아이디어노트"
                title = re.sub(r"\s*[—\-]\s*(아이디어노트|아이디어).*$", "", title).strip()
                if title:
                    return title
        return None
    except (OSError, UnicodeDecodeError):
        return None


def _get_last_modified(project_path: Path) -> str | None:
    """Get the most recent file modification time in a project."""
    latest = 0.0
    try:
        for root, _dirs, files in os.walk(project_path):
            # Skip hidden directories and common large dirs
            root_path = Path(root)
            if any(part.startswith(".") for part in root_path.parts):
                continue
            if "node_modules" in root_path.parts or "__pycache__" in root_path.parts:
                continue
            for f in files:
                if f.startswith("."):
                    continue
                try:
                    fpath = root_path / f
                    mtime = fpath.stat().st_mtime
                    if mtime > latest:
                        latest = mtime
                except OSError:
                    continue
    except OSError:
        return None

    if latest == 0.0:
        return None
    return datetime.fromtimestamp(latest).isoformat()


def scan_projects() -> list[dict[str, Any]]:
    """Scan ~/Projects/{0-7}_*/ folders and return project list."""
    projects: list[dict[str, Any]] = []

    for stage_num, stage_folder in sorted(STAGE_FOLDERS.items()):
        stage_path = PROJECTS_ROOT / stage_folder
        if not stage_path.is_dir():
            continue

        for item in sorted(stage_path.iterdir()):
            if not item.is_dir():
                continue
            if item.name.startswith("."):
                continue
            # Skip common folders and _prefixed folders (meta folders)
            if item.name in COMMON_FOLDERS or item.name.startswith("_"):
                continue

            project: dict[str, Any] = {
                "name": item.name,
                "stage": stage_folder,
                "stage_number": stage_num,
                "path": str(item),
            }

            # Check for docs/_아이디어노트.md
            idea_note = item / "docs" / "_아이디어노트.md"
            if idea_note.exists():
                metadata = _parse_idea_note(idea_note)
                project["metadata"] = metadata
            else:
                project["metadata"] = {}

            # Fallback: if no description, try README.md
            if not project["metadata"].get("description"):
                readme_desc, readme_title = _parse_readme(item)
                if readme_desc:
                    project["metadata"]["description"] = readme_desc
                if readme_title:
                    project["metadata"].setdefault("label", readme_title)

            # If still no label, check if _아이디어노트 title (# line) has one
            if not project["metadata"].get("label"):
                label = _parse_idea_note_title(item)
                if label:
                    project["metadata"]["label"] = label

            # Check has_docs
            docs_dir = item / "docs"
            project["has_docs"] = docs_dir.is_dir() and any(docs_dir.iterdir()) if docs_dir.is_dir() else False

            # Get last modified
            project["last_modified"] = _get_last_modified(item)

            # Inject real subtask counts (overrides metadata values)
            try:
                from services import subtask_service
                counts = subtask_service.get_counts(item.name)
                project["metadata"]["subtasks_total"] = str(counts.get("total", 0))
                project["metadata"]["subtasks_done"] = str(counts.get("done", 0))
            except Exception:
                pass

            projects.append(project)

    return projects


def _find_project_path(project_name: str) -> Path | None:
    """Find a project path across all stage folders.

    Prefer paths that have docs/_아이디어노트.md to avoid residual folders.
    """
    fallback = None
    for stage_folder in STAGE_FOLDERS.values():
        candidate = PROJECTS_ROOT / stage_folder / project_name
        if candidate.is_dir():
            # Prefer path with actual docs
            if (candidate / "docs" / "_아이디어노트.md").is_file():
                return candidate
            if fallback is None:
                fallback = candidate
    return fallback


# Allowed metadata keys for update
EDITABLE_META_KEYS = {
    "중요도", "위급도", "긴급도", "협업", "주도", "오너", "label",
    "유형", "포트", "상태",
    "목표종료일", "실제종료일", "subtasks_total", "subtasks_done",
    "related_people",
}


def update_metadata(project_name: str, updates: dict[str, str]) -> dict[str, Any]:
    """Update metadata fields in a project's _아이디어노트.md.

    Uses YAML frontmatter if present, otherwise converts blockquote to YAML.
    """
    project_path = _find_project_path(project_name)
    if project_path is None:
        return {"success": False, "message": f"Project not found: {project_name}"}

    idea_note = project_path / "docs" / "_아이디어노트.md"

    # Auto-create if doesn't exist
    if not idea_note.exists():
        idea_note.parent.mkdir(parents=True, exist_ok=True)
        from datetime import date
        meta = {"label": project_name, "작성일": date.today().isoformat(), "오너": "Chad"}
        safe = {k: v for k, v in updates.items() if k in EDITABLE_META_KEYS and v}
        meta.update(safe)
        idea_note.write_text(
            _build_yaml_frontmatter(meta) + f"\n# {project_name}\n",
            encoding="utf-8",
        )
        return {"success": True, "message": "Created and saved", "updated": list(safe.keys())}

    safe_updates = {k: v for k, v in updates.items() if k in EDITABLE_META_KEYS}
    if not safe_updates:
        return {"success": False, "message": "No valid metadata keys provided"}

    try:
        content = idea_note.read_text(encoding="utf-8")
        yaml_meta, body = _parse_yaml_frontmatter(content)

        if yaml_meta:
            # Update existing YAML frontmatter
            for k, v in safe_updates.items():
                if v:
                    yaml_meta[k] = v
                elif k in yaml_meta:
                    del yaml_meta[k]
            new_content = _build_yaml_frontmatter(yaml_meta) + body
        else:
            # Convert blockquote to YAML frontmatter
            existing_meta = _parse_idea_note(idea_note)
            existing_meta.update({k: v for k, v in safe_updates.items() if v})
            for k in safe_updates:
                if not safe_updates[k] and k in existing_meta:
                    del existing_meta[k]

            # Remove blockquote lines and rebuild with YAML
            lines = content.splitlines()
            body_lines: list[str] = []
            skip_blockquotes = True
            for line in lines:
                stripped = line.strip()
                if skip_blockquotes and stripped.startswith(">"):
                    continue
                if skip_blockquotes and stripped == "---":
                    skip_blockquotes = False
                    continue
                skip_blockquotes = False
                body_lines.append(line)

            # Remove description from metadata (it lives in body)
            desc = existing_meta.pop("description", None)
            new_content = _build_yaml_frontmatter(existing_meta) + "\n".join(body_lines)

        idea_note.write_text(new_content, encoding="utf-8")
        return {"success": True, "message": "Metadata updated", "updated": list(safe_updates.keys())}
    except OSError as e:
        return {"success": False, "message": f"Failed to update: {e}"}


def _build_yaml_frontmatter(metadata: dict[str, Any]) -> str:
    """Build YAML frontmatter string from metadata dict."""
    if not metadata:
        return ""
    # Order keys for readability
    key_order = [
        "label", "작성일", "상태", "유형", "포트",
        "중요도", "위급도", "긴급도", "협업", "주도", "오너",
        "목표종료일", "실제종료일", "subtasks_total", "subtasks_done",
        "related_people",
    ]
    ordered: dict[str, Any] = {}
    for k in key_order:
        if k in metadata:
            ordered[k] = metadata[k]
    for k, v in metadata.items():
        if k not in ordered:
            ordered[k] = v

    yaml_str = yaml.dump(ordered, allow_unicode=True, default_flow_style=False, sort_keys=False)
    return f"---\n{yaml_str}---\n"


def update_description(project_name: str, description: str) -> dict[str, Any]:
    """Update the description in a project's _아이디어노트.md file."""
    project_path = _find_project_path(project_name)
    if project_path is None:
        return {"success": False, "message": f"Project not found: {project_name}"}

    idea_note = project_path / "docs" / "_아이디어노트.md"

    # Auto-create if doesn't exist
    if not idea_note.exists():
        idea_note.parent.mkdir(parents=True, exist_ok=True)
        from datetime import date
        today = date.today().isoformat()
        idea_note.write_text(
            f"---\nlabel: {project_name}\n작성일: '{today}'\n오너: Chad\n---\n\n# {project_name}\n\n{description}\n",
            encoding="utf-8",
        )
        synced = ["_아이디어노트.md (created)"]
        _sync_readme_description(project_path, project_name, description, synced)
        return {"success": True, "message": "Created and saved", "synced_to": synced}

    try:
        content = idea_note.read_text(encoding="utf-8")

        # YAML frontmatter: just update/create body description
        yaml_meta, body = _parse_yaml_frontmatter(content)
        if yaml_meta:
            # Replace first non-heading, non-empty paragraph in body
            body_lines = body.splitlines()
            new_body: list[str] = []
            replaced = False
            for line in body_lines:
                s = line.strip()
                if not replaced and s and not s.startswith("#") and s != "---":
                    new_body.append(description)
                    replaced = True
                    continue
                new_body.append(line)
            if not replaced:
                new_body.append("")
                new_body.append(description)
            new_content = _build_yaml_frontmatter(yaml_meta) + "\n".join(new_body)
            idea_note.write_text(new_content, encoding="utf-8")
            synced = ["_아이디어노트.md"]
            _sync_readme_description(project_path, project_name, description, synced)
            _sync_discussion_description(project_path, description, synced)
            return {"success": True, "message": "Description updated", "synced_to": synced}

        # Legacy blockquote format
        lines = content.splitlines()
        new_lines: list[str] = []
        replaced = False
        i = 0

        while i < len(lines):
            line = lines[i]
            if line.strip() == "## 한 줄 요약":
                new_lines.append(line)
                i += 1
                # Skip blank lines after header
                while i < len(lines) and lines[i].strip() == "":
                    new_lines.append(lines[i])
                    i += 1
                # Replace old description lines until next --- or ##
                while i < len(lines):
                    stripped = lines[i].strip()
                    if stripped.startswith("##") or stripped == "---":
                        break
                    i += 1  # Skip old description
                # Insert new description
                new_lines.append(description)
                new_lines.append("")
                replaced = True
            else:
                new_lines.append(line)
                i += 1

        if not replaced:
            return {"success": False, "message": "No '## 한 줄 요약' section found"}

        idea_note.write_text("\n".join(new_lines), encoding="utf-8")

        # Sync to README.md if it exists
        synced: list[str] = ["_아이디어노트.md"]
        _sync_readme_description(project_path, project_name, description, synced)

        # Sync to _토의록.md header if it exists
        _sync_discussion_description(project_path, description, synced)

        return {"success": True, "message": "Description updated", "synced_to": synced}
    except OSError as e:
        return {"success": False, "message": f"Failed to update: {e}"}


def _sync_readme_description(
    project_path: Path, project_name: str, description: str, synced: list[str]
) -> None:
    """Sync description to README.md — update first paragraph after title."""
    for readme_name in ("README.md", "README_KO.md", "README_ZH.md"):
        readme = project_path / readme_name
        if not readme.is_file():
            continue

        try:
            content = readme.read_text(encoding="utf-8")
            lines = content.splitlines()
            new_lines: list[str] = []
            found_title = False
            replaced = False
            i = 0

            while i < len(lines):
                line = lines[i]
                # Find main title (# ProjectName)
                if not found_title and line.startswith("# "):
                    found_title = True
                    new_lines.append(line)
                    i += 1
                    # Skip blank lines after title
                    while i < len(lines) and lines[i].strip() == "":
                        new_lines.append(lines[i])
                        i += 1
                    # Check if next line is a description (not a heading/separator)
                    if i < len(lines):
                        next_stripped = lines[i].strip()
                        if next_stripped and not next_stripped.startswith("#") and next_stripped != "---":
                            # Replace old description line
                            new_lines.append(f"> {description}")
                            i += 1  # Skip old
                            replaced = True
                        else:
                            # Insert description before next section
                            new_lines.append(f"> {description}")
                            new_lines.append("")
                            replaced = True
                    continue
                new_lines.append(line)
                i += 1

            if replaced:
                readme.write_text("\n".join(new_lines), encoding="utf-8")
                synced.append(readme_name)
        except (OSError, UnicodeDecodeError):
            continue


def _sync_discussion_description(
    project_path: Path, description: str, synced: list[str]
) -> None:
    """Sync description to _토의록.md header comment if it exists."""
    discussion = project_path / "docs" / "_토의록.md"
    if not discussion.is_file():
        return

    try:
        content = discussion.read_text(encoding="utf-8")
        lines = content.splitlines()

        # Look for existing '> 설명:' line or add after title
        new_lines: list[str] = []
        replaced = False
        for line in lines:
            stripped = line.strip()
            if stripped.startswith("> 설명:") or stripped.startswith("> 요약:"):
                new_lines.append(f"> 요약: {description}")
                replaced = True
            else:
                new_lines.append(line)

        if replaced:
            discussion.write_text("\n".join(new_lines), encoding="utf-8")
            synced.append("_토의록.md")
    except (OSError, UnicodeDecodeError):
        pass


def migrate_to_yaml_frontmatter() -> dict[str, Any]:
    """Migrate all _아이디어노트.md files from blockquote to YAML frontmatter."""
    migrated: list[str] = []
    skipped: list[str] = []
    errors: list[str] = []

    for stage_folder in STAGE_FOLDERS.values():
        stage_path = PROJECTS_ROOT / stage_folder
        if not stage_path.is_dir():
            continue

        for item in stage_path.iterdir():
            if not item.is_dir() or item.name.startswith("."):
                continue
            if item.name in COMMON_FOLDERS:
                continue

            idea_note = item / "docs" / "_아이디어노트.md"
            if not idea_note.is_file():
                continue

            try:
                content = idea_note.read_text(encoding="utf-8")

                lines = content.splitlines()

                # If already has YAML frontmatter, merge blockquotes into it
                if content.startswith("---"):
                    yaml_meta, body = _parse_yaml_frontmatter(content)
                    body_lines_raw = body.splitlines()
                else:
                    yaml_meta = {}
                    body_lines_raw = lines

                # Collect all blockquote metadata from body
                metadata: dict[str, Any] = dict(yaml_meta)
                body_lines: list[str] = []
                skip_next_separator = False

                for line in body_lines_raw:
                    stripped = line.strip()
                    # Parse blockquote metadata lines anywhere
                    if stripped.startswith(">"):
                        cleaned = stripped.lstrip(">").strip()
                        m = re.match(r"^(.+?):\s*(.+)$", cleaned)
                        if m:
                            metadata[m.group(1).strip()] = m.group(2).strip()
                            continue
                        # Skip standalone > lines
                        continue
                    # Skip --- separators that immediately follow removed blockquotes
                    if skip_next_separator and stripped == "---":
                        skip_next_separator = False
                        continue
                    if stripped == "":
                        # Track if we just removed blockquotes
                        if body_lines and body_lines[-1:] == [""]:
                            skip_next_separator = True
                        body_lines.append(line)
                        continue
                    skip_next_separator = False
                    body_lines.append(line)

                # Extract label from # heading if not set
                for line in body_lines:
                    stripped = line.strip()
                    if stripped.startswith("# "):
                        title = stripped[2:].strip()
                        title = re.sub(r"\s*[—\-]\s*(아이디어노트|아이디어).*$", "", title).strip()
                        if title:
                            metadata.setdefault("label", title)
                        break

                # Remove description from frontmatter (lives in body)
                metadata.pop("description", None)

                # Clean body: remove leading/trailing empty lines
                while body_lines and body_lines[0].strip() == "":
                    body_lines.pop(0)
                while body_lines and body_lines[-1].strip() == "":
                    body_lines.pop()

                yaml_header = _build_yaml_frontmatter(metadata)
                new_content = yaml_header + "\n".join(body_lines) + "\n"
                idea_note.write_text(new_content, encoding="utf-8")
                migrated.append(item.name)

            except (OSError, UnicodeDecodeError) as e:
                errors.append(f"{item.name}: {e}")

    return {
        "success": True,
        "migrated": migrated,
        "skipped": skipped,
        "errors": errors,
        "summary": f"Migrated: {len(migrated)}, Skipped: {len(skipped)}, Errors: {len(errors)}",
    }


def delete_project(project_name: str) -> dict[str, Any]:
    """Permanently delete a project folder. Only allowed from 7_discarded."""
    project_path = PROJECTS_ROOT / "7_discarded" / project_name

    if not project_path.exists():
        return {"success": False, "message": f"Project not found in trash: {project_name}"}

    # Security: verify it's actually in 7_discarded
    resolved = project_path.resolve()
    discarded_root = (PROJECTS_ROOT / "7_discarded").resolve()
    if not str(resolved).startswith(str(discarded_root)):
        return {"success": False, "message": "Invalid project path"}

    try:
        shutil.rmtree(str(project_path))
        return {"success": True, "message": f"Permanently deleted {project_name}"}
    except OSError as e:
        return {"success": False, "message": f"Failed to delete: {e}"}


def create_project(
    folder_name: str,
    label: str = "",
    description: str = "",
    project_type: str = "",
    stage: str = "1_idea_stage",
) -> dict[str, Any]:
    """Create a new project folder with docs and _아이디어노트.md."""
    stage_path = PROJECTS_ROOT / stage
    if not stage_path.is_dir():
        stage_path.mkdir(parents=True, exist_ok=True)

    project_path = stage_path / folder_name
    if project_path.exists():
        return {"success": False, "message": f"Project '{folder_name}' already exists"}

    try:
        project_path.mkdir(parents=True)
        docs_dir = project_path / "docs"
        docs_dir.mkdir()

        from datetime import date
        today = date.today().isoformat()
        display_name = label or folder_name

        meta: dict[str, Any] = {
            "label": display_name,
            "작성일": today,
            "상태": "아이디어 단계" if stage == "1_idea_stage" else "초기화",
            "오너": "Chad",
        }
        if project_type:
            meta["유형"] = project_type

        idea_note = _build_yaml_frontmatter(meta)
        body = f"# {display_name}\n\n"
        if description:
            body += f"{description}\n"

        (docs_dir / "_아이디어노트.md").write_text(
            idea_note + body, encoding="utf-8"
        )

        return {
            "success": True,
            "message": f"Created {folder_name}",
            "path": str(project_path),
        }
    except OSError as e:
        return {"success": False, "message": f"Failed: {e}"}


def move_project(project_name: str, from_stage: str, to_stage: str) -> dict[str, Any]:
    """Move a project folder from one stage to another.

    Args:
        project_name: Name of the project folder
        from_stage: Source stage folder name (e.g., "2_initiation_stage")
        to_stage: Target stage folder name (e.g., "3_in_development")

    Returns:
        Dict with success status and message
    """
    from_path = PROJECTS_ROOT / from_stage / project_name
    to_dir = PROJECTS_ROOT / to_stage
    to_path = to_dir / project_name

    if not from_path.exists():
        return {"success": False, "message": f"Project not found: {from_path}"}

    if not to_dir.exists():
        return {"success": False, "message": f"Target stage folder not found: {to_dir}"}

    if to_path.exists():
        return {"success": False, "message": f"Project already exists in target: {to_path}"}

    try:
        # Step 1: Stop running servers before moving
        run_sh = from_path / "run.sh"
        if run_sh.exists():
            import subprocess
            subprocess.run(
                ["bash", str(run_sh), "stop"],
                cwd=str(from_path),
                timeout=15,
                capture_output=True,
            )

        # Step 2: Remove .run_ports to prevent stale port refs
        ports_file = from_path / ".run_ports"
        if ports_file.exists():
            ports_file.unlink()

        # Step 3: Move the project
        shutil.move(str(from_path), str(to_path))

        # Step 4: Clean up empty source directory if it still exists
        if from_path.exists() and not any(from_path.iterdir()):
            from_path.rmdir()

        return {
            "success": True,
            "message": f"Moved {project_name} from {from_stage} to {to_stage}",
            "new_path": str(to_path),
        }
    except OSError as e:
        return {"success": False, "message": f"Failed to move project: {e}"}


def create_transition_note(
    project_name: str, from_stage: str, to_stage: str, instruction: str
) -> dict[str, Any]:
    """Create a work instruction note when project transitions between stages."""
    project_path = _find_project_path(project_name)
    if project_path is None:
        return {"success": False, "message": "Project not found after move"}

    docs_dir = project_path / "docs"
    docs_dir.mkdir(parents=True, exist_ok=True)

    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M")
    filename = f"작업지시_{date_str}.md"

    filepath = docs_dir / filename

    # Stage label mapping
    stage_labels = {v: v.split("_", 1)[1].replace("_", " ").title() if "_" in v else v
                    for v in STAGE_FOLDERS.values()}
    from_label = stage_labels.get(from_stage, from_stage)
    to_label = stage_labels.get(to_stage, to_stage)

    note_content = f"""---
type: transition
date: "{date_str}"
time: "{time_str}"
from: "{from_stage}"
to: "{to_stage}"
---

# Work Instruction — {project_name}

**Transition**: {from_label} → {to_label}
**Date**: {date_str} {time_str}

---

## Instruction

{instruction.strip()}

---

## Checklist

- [ ] Review instruction above
- [ ] Execute tasks
- [ ] Update project status
- [ ] Update work instruction status upon completion
"""

    try:
        # If file already exists (multiple transitions same day), append
        if filepath.is_file():
            existing = filepath.read_text(encoding="utf-8")
            append = f"""

---

## Transition: {from_label} → {to_label} ({time_str})

{instruction.strip()}

- [ ] Review instruction
- [ ] Execute tasks
- [ ] Update status
- [ ] Update work instruction status upon completion
"""
            filepath.write_text(existing + append, encoding="utf-8")
        else:
            filepath.write_text(note_content, encoding="utf-8")

        return {"success": True, "filename": filename}
    except OSError as e:
        return {"success": False, "message": f"Failed to create note: {e}"}


def create_manual_instruction(
    project_name: str, instruction: str, checklist: list[str] | None = None
) -> dict[str, Any]:
    """Create a manual work instruction note (not from stage transition)."""
    project_path = _find_project_path(project_name)
    if project_path is None:
        return {"success": False, "message": f"Project not found: {project_name}"}

    docs_dir = project_path / "docs"
    docs_dir.mkdir(parents=True, exist_ok=True)

    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M")
    filename = f"작업지시_{date_str}.md"
    filepath = docs_dir / filename

    default_checklist = ["Review instruction", "Execute tasks", "Update status", "Update work instruction status upon completion"]
    checklist_items = checklist if checklist else default_checklist
    # Always append the status update item if custom checklist provided
    if checklist and "Update work instruction status upon completion" not in checklist:
        checklist_items.append("Update work instruction status upon completion")
    checklist_md = "\n".join(f"- [ ] {item}" for item in checklist_items)

    try:
        if filepath.is_file():
            existing = filepath.read_text(encoding="utf-8")
            append = f"""

---

## Manual Instruction ({time_str})

{instruction.strip()}

{checklist_md}
"""
            filepath.write_text(existing + append, encoding="utf-8")
        else:
            content = f"""---
type: manual
date: "{date_str}"
time: "{time_str}"
---

# Work Instruction — {project_name}

**Date**: {date_str} {time_str}

---

## Instruction

{instruction.strip()}

---

## Checklist

{checklist_md}
"""
            filepath.write_text(content, encoding="utf-8")

        return {"success": True, "filename": filename}
    except OSError as e:
        return {"success": False, "message": f"Failed: {e}"}


def scan_discussions() -> list[dict[str, Any]]:
    """Scan all projects for _토의록.md and extract discussion entries."""
    discussions: list[dict[str, Any]] = []

    for stage_folder in STAGE_FOLDERS.values():
        stage_path = PROJECTS_ROOT / stage_folder
        if not stage_path.is_dir():
            continue

        for item in sorted(stage_path.iterdir()):
            if not item.is_dir() or item.name.startswith("."):
                continue
            if item.name in COMMON_FOLDERS:
                continue

            discussion_file = item / "docs" / "_토의록.md"
            if not discussion_file.is_file():
                continue

            try:
                content = discussion_file.read_text(encoding="utf-8")
                _parse_discussion_entries(content, item.name, discussions)
            except (OSError, UnicodeDecodeError):
                continue

    # Sort by date descending
    discussions.sort(key=lambda d: d.get("date", ""), reverse=True)
    return discussions


def _parse_discussion_entries(
    content: str, project_name: str, discussions: list[dict[str, Any]]
) -> None:
    """Parse ## YYYY-MM-DD entries from _토의록.md content."""
    lines = content.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        # Match ## YYYY-MM-DD with optional (N) and title
        heading_match = re.match(
            r"^##\s+(\d{4}-\d{2}-\d{2})\s*(?:\(\d+\))?\s*(.*)", line.strip()
        )
        if heading_match:
            date_str = heading_match.group(1)
            title = heading_match.group(2).strip()

            # Scan subsequent lines for metadata fields
            time_val = ""
            topic_val = ""
            j = i + 1
            while j < len(lines):
                sub = lines[j].strip()
                # Stop at next heading or empty section boundary
                if sub.startswith("## ") or sub.startswith("# "):
                    break
                time_match = re.match(r"\*\*시간\*\*:\s*(.*)", sub)
                if time_match:
                    time_val = time_match.group(1).strip()
                topic_match = re.match(r"\*\*주제\*\*:\s*(.*)", sub)
                if topic_match:
                    topic_val = topic_match.group(1).strip()
                j += 1

            discussions.append({
                "project_name": project_name,
                "date": date_str,
                "title": title,
                "time": time_val,
                "topic": topic_val,
            })
        i += 1


def scan_work_instructions() -> list[dict[str, Any]]:
    """Scan all projects for pending work instructions (unchecked items)."""
    instructions: list[dict[str, Any]] = []

    for stage_folder in STAGE_FOLDERS.values():
        stage_path = PROJECTS_ROOT / stage_folder
        if not stage_path.is_dir():
            continue

        for item in sorted(stage_path.iterdir()):
            if not item.is_dir() or item.name.startswith("."):
                continue
            if item.name in COMMON_FOLDERS:
                continue

            docs_dir = item / "docs"
            if not docs_dir.is_dir():
                continue

            # Find 작업지시_*.md files
            for f in sorted(docs_dir.glob("작업지시_*.md"), reverse=True):
                try:
                    content = f.read_text(encoding="utf-8")
                    unchecked = []
                    checked = []
                    # Extract all checklist items
                    for line in content.splitlines():
                        stripped = line.strip()
                        if stripped.startswith("- [ ]"):
                            unchecked.append(stripped[5:].strip())
                        elif stripped.startswith("- [x]") or stripped.startswith("- [X]"):
                            checked.append(stripped[5:].strip())

                    if not unchecked:
                        continue  # All done, skip

                    # Extract instruction blocks
                    blocks: list[dict[str, str]] = []
                    current_instruction = ""
                    current_time = ""
                    in_instruction = False

                    for line in content.splitlines():
                        stripped = line.strip()
                        if stripped.startswith("## Instruction"):
                            in_instruction = True
                            continue
                        if stripped.startswith("## Transition:"):
                            # Extract time from "## Transition: X → Y (HH:MM)"
                            m = re.search(r"\((\d{2}:\d{2})\)", stripped)
                            current_time = m.group(1) if m else ""
                            in_instruction = True
                            continue
                        if in_instruction and (stripped.startswith("##") or stripped == "---"):
                            if current_instruction.strip():
                                blocks.append({
                                    "time": current_time,
                                    "text": current_instruction.strip(),
                                })
                            current_instruction = ""
                            in_instruction = stripped.startswith("## Instruction") or stripped.startswith("## Transition:")
                            if not in_instruction:
                                continue
                        if in_instruction and stripped and not stripped.startswith("- ["):
                            current_instruction += stripped + "\n"

                    if current_instruction.strip():
                        blocks.append({
                            "time": current_time,
                            "text": current_instruction.strip(),
                        })

                    # Extract date from filename
                    date_match = re.search(r"작업지시_(\d{4}-\d{2}-\d{2})", f.name)
                    date_str = date_match.group(1) if date_match else ""

                    instructions.append({
                        "project": item.name,
                        "stage": stage_folder,
                        "path": str(item),
                        "filename": f.name,
                        "date": date_str,
                        "blocks": blocks,
                        "unchecked": unchecked,
                        "checked": checked,
                        "total": len(unchecked) + len(checked),
                        "done": len(checked),
                    })
                except (OSError, UnicodeDecodeError):
                    continue

    return instructions


def mark_instruction_done(
    project_name: str, filename: str, item_text: str, project_path_str: str = ""
) -> dict[str, Any]:
    """Mark a checklist item as done in a work instruction file."""
    # Use explicit path if provided, otherwise search
    if project_path_str:
        project_path = Path(project_path_str)
    else:
        project_path = _find_project_path(project_name)
    if project_path is None or not project_path.is_dir():
        return {"success": False, "message": "Project not found"}

    filepath = project_path / "docs" / filename
    if not filepath.is_file():
        return {"success": False, "message": "File not found"}

    try:
        content = filepath.read_text(encoding="utf-8")
        # Replace first matching unchecked item
        old = f"- [ ] {item_text}"
        new = f"- [x] {item_text}"
        if old in content:
            content = content.replace(old, new, 1)
            filepath.write_text(content, encoding="utf-8")
            return {"success": True, "message": f"Marked done: {item_text}"}
        return {"success": False, "message": "Item not found"}
    except OSError as e:
        return {"success": False, "message": f"Failed: {e}"}
