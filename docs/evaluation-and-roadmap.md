# PM Master v1.0.0 — Evaluation & Future Roadmap

## Date: 2026-03-20

---

## 1. Application Evaluation

### Strengths

#### 1.1 Clear Design Philosophy
"Filesystem as database" — the `~/Projects/` folder structure directly reflects project state without requiring a separate database. This provides:
- Zero data migration overhead
- Backup is a simple folder copy
- Projects can be moved via Finder/terminal and the app reflects changes immediately
- Complete data portability across machines

#### 1.2 High Feature Density
Built in 8.5 hours with 16,182 lines of code across 43 files. Features that are typically standalone SaaS products are unified in a single interface:
- Kanban board (like Trello)
- Gantt chart (like Monday.com)
- Issue tracker (like Linear)
- Todo management (like Todoist)
- Document editor (like Notion)
- Server control panel (like PM2)
- People directory (like a CRM)

#### 1.3 Research + Development Dual-Purpose
Very few tools handle both academic research workflows (literature review → analysis → paper writing) and software development simultaneously. The 7-stage lifecycle maps naturally to both:
- Research: Idea → Literature Review → Data Collection → Analysis → Writing → Submission → Archive
- Development: Idea → Planning → Development → Testing → Release → Maintenance → Archive

#### 1.4 Claude Code Integration
Work instruction → embedded terminal → AI execution → checklist auto-update pipeline demonstrates a concrete implementation of AI-assisted development workflow.

#### 1.5 Privacy & Ownership
All data stored as local JSON files. No cloud dependency, no third-party data storage, complete ownership of project data.

### Areas for Improvement

#### 2.1 Component File Size
`projects/[name]/page.tsx` exceeds 3,500 lines. This monolithic component handles all 6 tabs (Settings, Documents, Todo, Issues, Schedule, Work Orders) in a single file.

**Recommendation**: Split into per-tab components:
```
components/project/
├── SettingsTab.tsx
├── DocumentsTab.tsx
├── TodoTab.tsx
├── IssuesTab.tsx
├── ScheduleTab.tsx
└── InstructionsTab.tsx
```

#### 2.2 State Management
Pages with 50+ `useState` hooks make the code hard to follow and maintain.

**Recommendation**: Adopt Zustand or React Context for related state groups:
- Schedule state (tasks, milestones, categories, editing state)
- Document state (docs, path, selected, content, editing)
- Issue state (issues, comments, filters)

#### 2.3 API Error Handling
Most catch blocks are empty `catch {}` or simple `toast.error()`. No distinction between:
- Network errors (offline, timeout)
- Auth errors (token expired)
- Business logic errors (conflict, not found)
- Server errors (500)

**Recommendation**: Centralized error handler with categorized responses and appropriate user feedback.

#### 2.4 Test Coverage
Zero test code exists. As Local and Online versions diverge, regression prevention becomes critical.

**Recommendation**: Priority test targets:
- Backend: scanner_service (project scanning), schedule_service (date calculations, dependency logic)
- Frontend: E2E tests for critical flows (create project, move between stages, schedule CRUD)

#### 2.5 Performance
Dashboard loads ALL projects every time. With 50+ projects, this could become slow.

**Recommendation**:
- Implement pagination or virtual scrolling for large project lists
- Cache project metadata in memory with file-watcher invalidation
- Lazy-load tab content in project detail page

---

## 2. Shared Improvement Roadmap (Both Local & Online)

### Priority 1: Code Quality
- [ ] Split `[name]/page.tsx` into per-tab components
- [ ] Extract reusable hooks: `useSchedule`, `useDocuments`, `useIssues`
- [ ] Centralized error handling with error boundary
- [ ] Add backend API tests (pytest) for critical services
- [ ] Add E2E tests (Playwright) for critical user flows

### Priority 2: UX Improvements
- [ ] Gantt: drag-to-resize task bars (change dates by dragging)
- [ ] Gantt: drag tasks to reorder within categories
- [ ] Calendar view for schedule (month view with task dots)
- [ ] Dashboard: keyboard shortcuts (J/K navigation, Enter to open)
- [ ] Global search across all projects (Cmd+K)
- [ ] Notification center for overdue tasks and milestone reminders

### Priority 3: Data & Export
- [ ] Project template system (create project from template)
- [ ] Bulk project operations (multi-select + batch move/delete)
- [ ] Timeline view enhancement (swimlanes by type)
- [ ] Report generation (project summary, schedule progress, issue stats)

---

## 3. PM Master Local — Specific Roadmap

### Purpose: Personal desktop productivity tool

### Planned Features
- [ ] Filesystem watcher: auto-detect folder changes without manual rescan
- [ ] Local AI integration: Ollama/LLM Studio for offline AI features
- [ ] Desktop notifications: overdue tasks, milestone reminders (via macOS Notification Center)
- [ ] Spotlight integration: search projects from macOS Spotlight
- [ ] Quick launch: menu bar app for instant server start/stop
- [ ] Backup automation: scheduled backup to Dropbox/iCloud
- [ ] Git integration: show branch, commit count, last commit in project cards
- [ ] Homebrew package: `brew install pm-master-local` for easy distribution

---

## 4. PM Master Online — Specific Roadmap

### Purpose: Multi-user collaboration platform for research teams

### Planned Features
- [ ] User management: registration, roles (Admin/Manager/Member/Viewer)
- [ ] Real-time collaboration: WebSocket-based live updates
- [ ] Database migration: JSON files → PostgreSQL/SQLite for concurrent access
- [ ] File upload: replace filesystem access with upload-based document management
- [ ] Permission system: project-level access control (owner/editor/viewer)
- [ ] Activity feed: who changed what, when (audit log)
- [ ] Comments & mentions: @user notifications in issues and documents
- [ ] Cloud deployment: Docker + docker-compose for easy self-hosting
- [ ] API authentication: OAuth2 / JWT with refresh tokens
- [ ] Mobile responsive: optimize for tablet and mobile access

---

## 5. Architecture Recommendations

### Current Architecture
```
Browser → Next.js (SSR/CSR) → FastAPI → Filesystem + JSON
```

### Recommended Evolution (Online)
```
Browser → Next.js → FastAPI → PostgreSQL
                           → Redis (cache/sessions)
                           → S3/MinIO (file storage)
                           → WebSocket (real-time)
```

### Recommended Evolution (Local)
```
Browser → Next.js → FastAPI → Filesystem + JSON (unchanged)
                           → fsnotify (file watcher)
                           → SQLite (optional, for search index)
```

---

## 6. Version Strategy

| Version | Scope | Timeline |
|---------|-------|----------|
| v1.0.0 | Current release (2026-03-20) | Done |
| v1.1.0 | Code quality: component split, hooks extraction | Next sprint |
| v1.2.0 | UX: gantt drag, calendar view, global search | Following sprint |
| v2.0.0 (Online) | DB migration, user management, real-time | Major milestone |
| v2.0.0 (Local) | File watcher, git integration, desktop features | Major milestone |

---

## 7. Sync Rules (v1.0.0+)

- No `cp` full-file sync between Local and Online
- Shared bug fixes: apply individually via Edit to both projects
- Shared features: implement independently in each project (same logic, separate files)
- Divergent features: implement only in the target project
- Port convention: Local = 8000/3000, Online = 8002/3002
- Branding: Local = "PM Master Local", Online = "PM Master Online"
