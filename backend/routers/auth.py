"""Authentication endpoints."""

from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

from services import auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/login")
def login(body: LoginRequest):
    """Authenticate with password and receive a token."""
    token = auth_service.login(body.password)
    if token is None:
        raise HTTPException(status_code=401, detail="Invalid password")
    return {"token": token}


@router.post("/change-password")
def change_password(body: ChangePasswordRequest):
    """Change the password."""
    success = auth_service.change_password(body.current_password, body.new_password)
    if not success:
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    return {"message": "Password changed successfully"}


@router.get("/verify")
def verify_token(request: Request):
    """Verify token validity (already checked by middleware)."""
    return {"valid": True}
