"""solver: 整批求最优 (近优) 布局。POST 求解端点在 Phase 3 实现 (进程池 + 硬超时)。"""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/api/solver", tags=["solver"])
