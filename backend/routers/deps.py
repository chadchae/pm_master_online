"""Shared dependencies and utilities for router modules."""

import threading

from services import project_meta_service


def _refresh_meta_bg(project_name: str) -> None:
    """Background task: regenerate _project_meta.md silently."""
    try:
        project_meta_service.generate_meta(project_name)
    except Exception:
        pass


# Debounce: track pending meta refreshes to avoid redundant work
_pending_meta: set[str] = set()


def refresh_meta(project_name: str) -> None:
    """Schedule meta refresh in a background thread (non-blocking)."""
    if project_name in _pending_meta:
        return
    _pending_meta.add(project_name)

    def run():
        try:
            _refresh_meta_bg(project_name)
        finally:
            _pending_meta.discard(project_name)

    threading.Thread(target=run, daemon=True).start()
