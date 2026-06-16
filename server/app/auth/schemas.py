"""auth API schemas (camelCase 边界)。"""

from __future__ import annotations

from app.auth.models import UserRole
from app.common import CamelModel


class LoginRequest(CamelModel):
    username: str
    password: str


class TokenResponse(CamelModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(CamelModel):
    id: str
    username: str
    role: UserRole
