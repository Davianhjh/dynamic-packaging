"""manifest: 清单保存 / 确认时一次性库存校验 / 导出。端点在 Phase 4 实现。"""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/api/manifest", tags=["manifest"])
