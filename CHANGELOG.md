# Changelog

## v0.1.0 (2026-03-18)

### Features
- **NEW**: Session export/import (full ZIP backup and restore)
- **NEW**: Password change in user profile modal
- **NEW**: UserSettings now saved to backend API (not just sessionStorage)
- **NEW**: Session-scoped LLM settings (provider/model/API key per session)
- **NEW**: Landing page shows login and register forms always visible

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
