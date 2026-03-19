# PM Master v1.0.0 Development Report

## Overview

| Item | Value |
|------|-------|
| Project | PM Master (Local + Online) |
| Version | v1.0.0 |
| Development Period | 2026-03-19 21:31 ~ 2026-03-20 05:56 (CST) |
| Total Development Time | ~8.5 hours |
| Developer | Chad (Chungil Chae) |
| AI Assistant | Claude Opus 4 via Claude Code |

## Codebase Statistics

| Metric | Value |
|--------|-------|
| Total Commits | 53 |
| Frontend Code | 11,767 lines (31 files, TypeScript/React) |
| Backend Code | 4,415 lines (12 files, Python/FastAPI) |
| Total Code | 16,182 lines (43 files) |
| Productivity | ~1,904 lines/hour, ~6.2 commits/hour |

## Cost Analysis

### AI Development Cost (Claude Code)

| Item | Estimate |
|------|----------|
| Total Tokens | ~3M-5M (input + output combined) |
| Model | Claude Opus 4 |
| Pricing | Input $15/M tokens, Output $75/M tokens |
| Estimated Cost | $80-$150 |

### Comparison: Traditional Development

| Item | Estimate |
|------|----------|
| Equivalent Human Effort | 16,000 lines x 50 lines/hour = 320 hours (8 weeks) |
| Full-stack Developer Rate | $50/hour |
| Traditional Cost | $16,000 |
| **Cost Reduction** | **99%+** |
| **Time Reduction** | **8.5 hours vs 320 hours (97%)** |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12 / FastAPI |
| Frontend | Next.js 15 / React 19 / TypeScript / TailwindCSS |
| Data Storage | Local JSON files (no database) |
| Auth | bcrypt + PyJWT |
| Editor | @uiw/react-md-editor |
| Markdown | @uiw/react-markdown-preview |
| Terminal | @xterm/xterm + WebSocket PTY |
| Icons | Lucide React |
| Notifications | react-hot-toast |
| Metadata | YAML frontmatter (pyyaml) |

## Features Delivered in v1.0.0

### Core
- 7-stage project lifecycle (Idea → Initiation → Development → Testing → Completed → Archived → Discarded)
- Dashboard kanban board + list view with multi-column sorting
- 4 dashboard theme variations (A/B/C/D) for light and dark modes
- Project detail with 6 tabs (Settings, Documents, Todo, Issues, Schedule, Work Orders)

### Schedule / Gantt
- Task CRUD with assignee, dates, status, categories, dependencies
- Gantt chart with category tracks, dependency arrows, today line
- Milestones with diamond markers, edit/delete
- 30-color category palette with auto-assignment
- Parent task auto-date calculation

### Collaboration
- People directory with card/list view, inline editing
- Issue tracker with comments, timeline, status management
- Todo kanban (3 columns) with priority, assignee, due dates

### Server Control
- Card view with dual port status (BE/FE)
- Start/Stop/Restart per server + bulk actions
- Inline terminal log panel with auto-refresh

### Document Management
- Markdown editor with split preview
- Markdown rendered view for .md files
- Print/PDF export, MD/CSV download
- Folder navigation with breadcrumb

### UI/UX
- In-app modal dialogs (no browser prompt/confirm)
- Dark/light theme with next-themes
- Multi-language (Korean/English, 280+ translation keys)
- Type filter with management (rename/delete across projects)
- Filter persistence via localStorage
- Drag-and-drop card reordering

## Architecture

```
pm-master-{local|online}/
├── backend/
│   ├── main.py                     # FastAPI app + all endpoints
│   ├── services/
│   │   ├── scanner_service.py      # Project scanning and metadata
│   │   ├── schedule_service.py     # Schedule/gantt/milestone/category
│   │   ├── todo_service.py         # Todo kanban
│   │   ├── issue_service.py        # Issue tracker
│   │   ├── subtask_service.py      # Project subtasks
│   │   ├── document_service.py     # Document file management
│   │   ├── server_service.py       # Server control
│   │   ├── common_folder_service.py # Notes/learning/issues
│   │   ├── people_service.py       # People directory
│   │   └── auth_service.py         # JWT authentication
│   ├── data/                       # JSON data (gitignored)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/dashboard/          # All pages
│   │   ├── components/             # Reusable components
│   │   └── lib/                    # API, stages, i18n, auth
│   └── package.json
├── docs/
├── run.sh                          # Server control script
├── setup.sh                        # One-command installation
├── CHANGELOG.md
├── README.md / README_KO.md / README_ZH.md
└── .gitignore
```

## Key Decisions & Learnings

1. **Filesystem as database**: No DB needed — `~/Projects/` folder structure IS the project state
2. **Gantt today line**: DOM order matters more than z-index for overlapping elements
3. **Duration calculation**: Inclusive (end - start + 1) for intuitive day counting
4. **Browser dialogs**: All prompt()/confirm() replaced with AppDialogs components
5. **Type vs Category**: Types are project-level metadata, categories are schedule-level groupings
6. **Filter persistence**: localStorage survives navigation without prop drilling
7. **Port management**: lsof-only approach (no file-based tracking) prevents stale port issues

## Branching Strategy (v1.0.0+)

- **PM Master Local** (pm-master-local): Personal desktop tool, filesystem access
- **PM Master Online** (pm-master-online): Multi-user collaboration, cloud-ready
- No more full cp sync — individual feature sync only for shared bugs/features
