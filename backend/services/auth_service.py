"""Authentication service for single-user password-based auth."""

import json
import secrets
import time
from pathlib import Path

import bcrypt

# Path to auth data file
DATA_DIR = Path(__file__).parent.parent / "data"
AUTH_FILE = DATA_DIR / "auth.json"
TOKENS_FILE = DATA_DIR / "tokens.json"

# Default password
DEFAULT_PASSWORD = "admin"

# Token expiry duration in seconds (24 hours)
TOKEN_EXPIRY_SECONDS = 86400


def _ensure_auth_file() -> None:
    """Create auth.json with default hashed password if it doesn't exist."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not AUTH_FILE.exists():
        hashed = bcrypt.hashpw(
            DEFAULT_PASSWORD.encode("utf-8"), bcrypt.gensalt()
        )
        data = {"password_hash": hashed.decode("utf-8")}
        AUTH_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _load_auth_data() -> dict:
    """Load auth data from file."""
    _ensure_auth_file()
    return json.loads(AUTH_FILE.read_text(encoding="utf-8"))


def _save_auth_data(data: dict) -> None:
    """Save auth data to file."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    AUTH_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _load_tokens() -> dict[str, float]:
    """Load tokens from file."""
    if not TOKENS_FILE.exists():
        return {}
    try:
        data = json.loads(TOKENS_FILE.read_text(encoding="utf-8"))
        # Clean expired on load
        now = time.time()
        return {t: exp for t, exp in data.items() if exp > now}
    except (json.JSONDecodeError, OSError):
        return {}


def _save_tokens(tokens: dict[str, float]) -> None:
    """Save tokens to file."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    TOKENS_FILE.write_text(json.dumps(tokens), encoding="utf-8")


def verify_password(password: str) -> bool:
    """Verify a password against the stored hash."""
    data = _load_auth_data()
    stored_hash = data["password_hash"].encode("utf-8")
    return bcrypt.checkpw(password.encode("utf-8"), stored_hash)


def login(password: str) -> str | None:
    """Authenticate with password and return a token if valid."""
    if not verify_password(password):
        return None
    token = secrets.token_urlsafe(32)
    tokens = _load_tokens()
    tokens[token] = time.time() + TOKEN_EXPIRY_SECONDS
    _save_tokens(tokens)
    return token


def verify_token(token: str) -> bool:
    """Check if a token is valid and not expired."""
    tokens = _load_tokens()
    if token not in tokens:
        return False
    return tokens[token] > time.time()


def change_password(current_password: str, new_password: str) -> bool:
    """Change the password if current password is correct."""
    if not verify_password(current_password):
        return False
    hashed = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt())
    data = _load_auth_data()
    data["password_hash"] = hashed.decode("utf-8")
    _save_auth_data(data)
    # Invalidate all existing tokens on password change
    _save_tokens({})
    return True
