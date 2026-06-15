"""catalog: 商品 / 库存 / 上下架 / 对内库存校验。端点在 Phase 1 实现。"""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/api/catalog", tags=["catalog"])
