# Next.js + FastAPI Full-Stack Starter Template

Production-ready full-stack starter template with built-in authentication, session-based data isolation, async background processing, and step-by-step workflow infrastructure.

## Prerequisites

- Python 3.12+
- Node.js 18+

## Quick Start

```bash
git clone https://github.com/ChadApplication/_template.git
cd _template
./setup.sh          # One-command setup (venv + npm + DB + seed)
./run.sh start      # Start servers
```

Open http://localhost:3001 and log in with `admin` / `admin`.

### Default Accounts

| Username | Password | Role |
|----------|----------|------|
| admin | admin | ADMIN |
| guest | guest | GUEST |

### Commands

```bash
./run.sh start      # Start Backend + Frontend
./run.sh stop       # Stop all servers
./run.sh restart    # Restart
./run.sh live       # Start + live log streaming
```

## Tech Stack
- **Backend:** Python 3.12 / FastAPI
- **Frontend:** Next.js 15 (App Router) / React 19 / TailwindCSS / TypeScript
- **Database:** Prisma ORM / SQLite (default)
- **Auth:** NextAuth.js (Credentials Provider)

---

## Core Features

### 1. Authentication (NextAuth + Prisma)
- Email/password login and registration
- `User` model for account management
- Unified auth sessions across client and server components
- **Bearer token authentication** — backend `verify_token()` extracts user_id from `Authorization: Bearer {user_id}` header
- **401 auto-redirect** — unauthenticated requests return 401, frontend automatically redirects to `/login`
- **No anonymous fallback** — `mock_token` or missing tokens are rejected (prevents data contamination)

### 2. Session-Based Project Management
- Each "new analysis" creates a unique `session_id` directory at `temp_uploads/{user_id}/{session_id}/`
- **Project metadata**: Card view on dashboard with title, description, creation date, last modified date
- **Step completion tracking**: `GET /api/session/status` auto-detects which steps have results
- **Per-step reset**: `DELETE /api/step/{step}` clears specific step data without affecting others
- **Per-step restore**: `GET /api/step/{step}/results` returns cached results for instant UI restoration
- **Variable persistence**: `POST/GET /api/variables` saves and restores variable definitions per session

### 3. Async Background Processing
- **Fire-and-forget pattern** — long-running LLM endpoints return `{status: "processing"}` immediately
- **Background task tracking** — `llm_tasks` dict keyed by `"{user_id}:{step}"` prevents cross-step state pollution
- **Progress polling** — `GET /api/progress?step=X` returns real-time progress + task completion status
- **User-level locking** — `asyncio.Lock` per user prevents concurrent destructive operations
- **tqdm integration** — progress updates are monkey-patched to write `progress.json` for frontend polling
- **Proxy timeout** — `next.config.ts` sets `proxyTimeout: 300_000` (5 min) for long requests

### 4. CSV Safety
- **Global `to_csv` monkey-patch** — all `DataFrame.to_csv()` calls automatically use `quoting=csv.QUOTE_ALL`
- Prevents `need to escape, but no escapechar set` errors with special characters in data

### 5. Session Export/Import
- **Full backup export** — download entire session as a ZIP file (all data, results, configs)
- **Session import/restore** — upload a backup ZIP to create or restore a project
- **Path traversal protection** — ZIP extraction validates paths to prevent directory escape

### 6. User Profile & Settings
- **Password change** — users can change their password via the profile modal
- **UserSettings backend save** — settings are persisted to the backend API (not just sessionStorage)
- **Session-scoped LLM settings** — each session stores its own LLM provider, model, and API key

### 7. UI/UX
- **Multi-language (i18n)**: Korean, English, Chinese via user settings or browser cookie
- **Dark Mode**: `next-themes` with no hydration flash
- **In-app Toast**: `react-hot-toast` for all feedback messages
- **Activity Tracker**: Logs page visits, button clicks, IP/UserAgent to DB
- **Landing page**: Login and register forms are always visible (no toggle needed)

### 8. API Proxy & Infrastructure
- **Next.js rewrites** proxy `/api/*` to FastAPI backend (port auto-detected from `.run_ports`)
- **Backend port discovery** — `run.sh` finds free ports, writes `.run_ports`, frontend reads it
- **Log capture** — `uvicorn.run(main.app)` pattern (not `-m uvicorn`) for proper stdout capture
- **Logs in /tmp** — avoids Dropbox/cloud sync interference with log buffering

---

## API Endpoints

### Session Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sessions` | Create new session |
| GET | `/api/sessions` | List all sessions for user |
| DELETE | `/api/sessions/{session_id}` | Delete session |
| GET | `/api/session/status` | Step completion status |

### Step Data (per analysis step)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/step/{step}/results` | Get cached step results |
| DELETE | `/api/step/{step}` | Delete step-specific files |
| GET | `/api/progress?step=X` | Progress + task status |

### Data Persistence
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/variables` | Save variable definitions |
| GET | `/api/variables` | Load variable definitions |
| POST | `/api/research-info` | Save research metadata |
| GET | `/api/research-info` | Load research metadata |

### User Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings` | Get user settings |
| POST | `/api/settings` | Save user settings |

---

## Quick Start

### 1. Clone and configure
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 2. Backend setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Frontend setup
```bash
cd frontend
npm install
npx prisma db push
npx prisma generate
```

### 4. Run both servers
```bash
./run.sh start
```

### Default ports
- **Frontend:** http://localhost:3001
- **Backend:** http://localhost:8001
- **API Docs:** http://localhost:8001/docs

### Other commands
```bash
./run.sh stop      # Stop all servers
./run.sh restart   # Restart all servers
./run.sh status    # Check server status
./run.sh live      # Stream live logs
```

---

## Architecture

```
_template_latest/
├── backend/
│   ├── main.py                    # FastAPI app + session infrastructure
│   ├── app/
│   │   └── routers/
│   │       └── session.py         # Session CRUD (Bearer auth)
│   ├── services/
│   │   └── user_settings_service.py
│   ├── temp_uploads/              # Per-user, per-session data (gitignored)
│   │   └── {user_id}/
│   │       └── {session_id}/
│   │           ├── variables.json
│   │           ├── research_info.json
│   │           ├── *_results.csv
│   │           └── progress.json
│   └── venv/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/         # Session list + create
│   │   │   ├── analysis/[id]/     # Workspace (analysis steps)
│   │   │   ├── login/
│   │   │   └── admin/
│   │   ├── components/
│   │   ├── services/
│   │   │   └── sessionApi.ts      # Bearer auth + 401 redirect
│   │   └── auth.ts                # NextAuth config
│   ├── next.config.ts             # Proxy rewrites + 300s timeout
│   └── package.json
├── run.sh                         # Start/stop/restart/live
└── .gitignore
```

---

## Adding New Analysis Steps

To add a new step to the workflow:

1. **Backend**: Add service function with `(user_id, session_id, ...)` signature
2. **Backend**: Add endpoint in `main.py` using `_run_llm_in_background()` for async processing
3. **Frontend**: Create component with `getToken` prop, `restoredOnce` restore guard, `handleReset` with backend DELETE
4. **Frontend**: Add progress polling with `step=your_step_name` parameter
5. **Backend**: The `GET /api/session/status` and `DELETE /api/step/{step}` endpoints auto-detect files matching `*_results.csv`/`*_results.json`

---

## Key Patterns

### Authentication flow
```
Frontend getToken() → session.user.id
    ↓
Authorization: Bearer {user_id}
    ↓
Backend verify_token() → {"sub": user_id}
    ↓
401 if missing/invalid → Frontend redirects to /login
```

### Async processing flow
```
POST /api/your-endpoint → returns {status: "processing"} immediately
    ↓
Background: _run_llm_in_background(user_id, "step_name", service_fn, ...)
    ↓
Frontend polls: GET /api/progress?step=step_name
    ↓
{status: "complete", result: {...}} or {status: "error", error: "..."}
```

### Session data isolation
```
temp_uploads/
├── user_abc/
│   ├── session_001/     ← isolated workspace
│   │   ├── variables.json
│   │   └── step_results.csv
│   └── session_002/     ← separate workspace
│       └── ...
└── user_xyz/            ← different user, no cross-access
    └── ...
```

## Changelog

### v0.0.1 (2026-03-17)

- Initial public release
- macOS bash 3.2 compatibility fix (run.sh)
- Python 3.12.8 migration
- DB seed automation (admin/guest accounts via setup.sh)
- dev.db removed from git tracking
- Copyright footer with auto-version
- setup.sh one-command installation

## License

Copyright (c) chadchae
