# Changelog

## [1.0.0] - 2026-03-20

### Milestone
- Official v1.0.0 release
- PM Master Online: Online collaboration-ready project management

### Core Features
- 7-stage project lifecycle (Idea → Initiation → Development → Testing → Completed → Archived → Discarded)
- Dashboard with kanban board + list view + 4 theme variations (A/B/C/D for light/dark)
- Project detail: 6 tabs (Settings, Documents, Todo, Issues, Schedule, Work Orders)
- Schedule/Gantt with milestones, categories (30-color palette), dependencies, today line
- Ideas page with card/list view, drag-drop reorder, type filter
- Server control with card view, dual port status, bulk actions, inline log panel
- People directory with card/list view, inline edit, sortable columns
- In-app modal dialogs (ConfirmDialog, PromptDialog, NewProjectDialog)
- Document viewer with markdown rendering, print/PDF export
- List export (Print/MD/CSV) for all list views
- Type management (rename/delete across all projects)
- Category management (rename/delete with auto-color palette)
- Multi-language (Korean/English), dark/light themes
- One-command setup (setup.sh + run.sh)

---

## v0.3.0 (2026-03-20)

### Added
- Schedule summary widget with real data on dashboard (replaces "Coming soon" placeholder)
- Document print/PDF export button (window.open + window.print)
- AppDialogs system replacing all browser prompt/confirm/alert with in-app modals
- localStorage-based filter persistence for type filters across navigation
- Schedule milestones visible on gantt chart
- Dependency auto-date calculation (start/end derived from dependencies)
- Custom type input in schedule type dropdown
- Dependency tag X-button removal in schedule edit form

### Fixed
- Gantt today line positioned at left edge of day column (was centered due to `dayWidth / 2`)
- Gantt today line renders in front of task bars (DOM order fix, z-20)
- Gantt auto-scroll positions today line at left edge (not center)
- Schedule duration calculation now inclusive (+1 day for correct range)
- Gantt uncategorized task ordering and milestone edit button
- Dashboard filters/sorting, tab order, schedule category/parent-task, gantt labels
- Filter persistence: always show 4 types, split tag columns for sorting
- Milestone top:-2 clipping fixed (overflow-hidden container)

### Changed
- Schedule edit form rendered as card instead of inline
- Wider dependencies column in schedule table
- Gantt date range calculation puts today at left edge

---

## v0.2.0 (2026-03-19)

### Added
- Schedule system with table view, gantt chart, and milestones
- Schedule edit with categories, dependencies enforcement, type filters, project counts
- Subtask system with CRUD, drag reorder, done/cancel status
- Issue tracker with discussion timeline, threaded comments CRUD, status, labels, filter counts
- Issue edit with comment CRUD, filter counts, due date on cards
- Todo kanban with checkbox, assignee, due date, summary widgets
- Project download as ZIP archive
- Card actions (edit/delete/download)
- New project creation buttons
- V1 sync, version labels
- Kanban sublabels (research context: Discussion / Data & Lit Review / Analysis / Writing / Submitted)
- Server log viewer
- Folder drill-down navigation in documents
- Comprehensive development specification document

### Fixed
- Subtask double creation and delete not working
- Card progress bar synced with real subtask counts
- Folder delete in document management

---

## v0.1.0 (2026-03-18)

### Added
- Session export/import (full ZIP backup and restore)
- Password change in user profile modal
- UserSettings saved to backend API (not just sessionStorage)
- Session-scoped LLM settings (provider/model/API key per session)
- Landing page shows login and register forms always visible

---

## v0.0.1 (2026-03-17)

- Initial public release
- macOS bash 3.2 compatibility fix (run.sh)
- Python 3.12.8 migration
- DB seed automation (admin/guest accounts via setup.sh)
- dev.db removed from git tracking
- Copyright footer with auto-version from git tags
- setup.sh one-command installation
- Port allocation: lsof-only (no stale file issue)
