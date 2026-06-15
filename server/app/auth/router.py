"""auth: 登录 / JWT / 角色。端点在 Phase 1 实现。"""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/api/auth", tags=["auth"])
