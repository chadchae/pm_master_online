# Project Manager

Local-first project management dashboard for `~/Projects/`. Manages project lifecycle from idea to completion with kanban boards, schedule/gantt charts, document management, and issue tracking.

## Prerequisites

- **macOS** (uses `lsof` for port management)
- **Python 3.12+**
- **Node.js 18+**

## Quick Start

```bash
./setup.sh          # One-command setup (venv + npm install)
./run.sh start      # Start servers
```

Open http://localhost:3002 and log in with `admin` / `admin`.

## Installation on Another Machine

### 1. Create project folder structure

```bash
mkdir -p ~/Projects/{1_idea_stage,2_initiation_stage,3_in_development,4_in_testing,5_completed,6_archived,7_discarded,_notes,_learning,_issues_common}
```

### 2. Clone or copy the app

Place `project-manager` anywhere on disk (e.g., inside `~/Projects/3_in_development/` or a separate directory).

### 3. Run setup

```bash
cd project-manager
./setup.sh
./run.sh start
```

### 4. Custom project root (optional)

If your projects live somewhere other than `~/Projects`:

```bash
export PROJECTS_ROOT="/path/to/my/projects"
./run.sh start
```

### 5. Custom ports (optional)

Default: backend `8002`, frontend `3002`. To override:

```bash
echo "BACKEND_PORT=8010" > .run_ports
echo "FRONTEND_PORT=3010" >> .run_ports
```

Or the app auto-finds free ports if defaults are taken.

## Required Folder Structure

The app scans `~/Projects/` (or `$PROJECTS_ROOT`) for these stage folders:

```
~/Projects/
  1_idea_stage/           # Ideas and brainstorming
  2_initiation_stage/     # Initiated projects (Discussion)
  3_in_development/       # Active development
  4_in_testing/           # Testing / Analysis phase
  5_completed/            # Completed / Writing phase
  6_archived/             # Archived / Submitted
  7_discarded/            # Trash
  _notes/                 # Personal notes
  _learning/              # Learning logs
  _issues_common/         # Cross-project issue records
```

Each project is a subfolder within a stage folder. Projects are moved between stages via drag-and-drop or the move dialog.

## Data Storage

All app data is stored locally in `backend/data/`:

| Data | Path | Description |
|------|------|-------------|
| Schedules | `backend/data/schedules/*.json` | Gantt tasks, milestones, categories per project |
| Todos | `backend/data/todos/*.json` | Kanban todo items per project |
| Issues | `backend/data/issues/*.json` | Issue tracker per project |
| Subtasks | `backend/data/subtasks/*.json` | Project subtasks |
| Users | `backend/data/users.json` | Login accounts (bcrypt hashed) |
| Card order | `backend/data/card_order.json` | Dashboard kanban card positions |
| People | `backend/data/people.json` | People directory |

To migrate data to another machine, copy the `backend/data/` directory.

## Default Accounts

| Username | Password | Role |
|----------|----------|------|
| admin | admin | ADMIN |
| guest | guest | GUEST |

## Commands

```bash
./run.sh start      # Start backend + frontend
./run.sh stop       # Stop all servers
./run.sh restart    # Restart both servers
./run.sh status     # Check server status
./run.sh live       # Start + live log streaming
```

## Features

### Dashboard
- Kanban board with 5-stage project lifecycle
- Drag-and-drop between stages with move instructions
- Card/list view toggle with column sorting
- Type filter: Personal, Research, Development, Other
- Dashboard theme selector (A/B/C/D for light and dark modes)
- Active project summary with colored badges

### Project Detail
- **Settings**: Project metadata (type, importance, severity, urgency, collaboration, people)
- **Documents**: File browser with markdown editor and rendered preview
- **Todos**: Kanban board (todo / in_progress / done)
- **Issues**: Issue tracker with comments and timeline
- **Schedule**: Task management with table and gantt chart views
- **Work Orders**: Work instruction documents

### Schedule / Gantt
- Task CRUD with assignee, dates, status, categories, dependencies
- Gantt chart with category tracks, dependency arrows, today line
- Milestones with diamond markers on gantt
- Parent task auto-date calculation
- 30-color category palette with auto-assignment
- Category rename and delete management
- Duration calculation (inclusive start/end dates)

### Ideas Page
- Separate idea management with card/list view
- Promote ideas to initiation stage
- Sortable columns (name, type, importance, severity, urgency)

### UI/UX
- Dark/light theme with `next-themes`
- In-app modal dialogs (no browser prompt/confirm)
- Markdown file rendering with `@uiw/react-markdown-preview`
- Print/PDF export for documents
- Multi-language support (i18n)

## Tech Stack

- **Backend**: Python 3.12 / FastAPI / JSON file storage
- **Frontend**: Next.js 15 (App Router) / React 19 / TailwindCSS / TypeScript
- **Auth**: JWT (bcrypt + PyJWT)
- **Editor**: @uiw/react-md-editor
- **Markdown**: @uiw/react-markdown-preview
- **Icons**: Lucide React
- **Notifications**: react-hot-toast

## Architecture

```
project-manager/
├── backend/
│   ├── main.py                     # FastAPI app + all endpoints
│   ├── services/
│   │   ├── scanner_service.py      # Project scanning and metadata
│   │   ├── schedule_service.py     # Schedule/gantt/milestone/category
│   │   ├── todo_service.py         # Todo kanban
│   │   ├── issue_service.py        # Issue tracker
│   │   ├── subtask_service.py      # Project subtasks
│   │   ├── document_service.py     # Document file management
│   │   ├── server_service.py       # Server control (run.sh)
│   │   ├── common_folder_service.py # Notes/learning/issues folders
│   │   ├── people_service.py       # People directory
│   │   └── auth_service.py         # JWT authentication
│   ├── data/                       # All JSON data (gitignored)
│   ├── requirements.txt
│   └── venv/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/          # Main dashboard
│   │   │   │   ├── page.tsx        # Kanban + list view
│   │   │   │   ├── ideas/          # Ideas management
│   │   │   │   ├── projects/       # Project list + detail
│   │   │   │   ├── [type]/         # Notes/learning/issues
│   │   │   │   ├── servers/        # Server status
│   │   │   │   ├── people/         # People directory
│   │   │   │   ├── timeline/       # Timeline view
│   │   │   │   └── trash/          # Discarded projects
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── AppDialogs.tsx      # ConfirmDialog, PromptDialog, NewProjectDialog
│   │   │   ├── Sidebar.tsx         # Navigation
│   │   │   ├── PageHeader.tsx      # Top header
│   │   │   ├── MoveProjectModal.tsx
│   │   │   ├── MetaTags.tsx        # Project meta badges
│   │   │   ├── ProgressBar.tsx     # Subtask progress
│   │   │   └── ...
│   │   └── lib/
│   │       ├── api.ts              # API client with auth
│   │       ├── stages.ts           # Stage configuration
│   │       ├── i18n.ts             # Internationalization
│   │       └── useAuth.ts          # Auth hook
│   ├── package.json
│   └── next.config.ts
├── docs/
├── run.sh                          # Start/stop/restart/live
├── setup.sh                        # One-command installation
├── CHANGELOG.md
└── .gitignore
```

## License

Copyright (c) chadchae
