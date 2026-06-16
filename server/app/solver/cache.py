"""solver 结果缓存：按 “商品集合 + 箱体” 为 key 写 Redis；Redis 不可用时静默跳过。"""

from __future__ import annotations

import hashlib
import json

import redis

from app.config import settings
from app.contract.packing_contract import PackRequest, PackResult

_client: redis.Redis | None = None
_disabled = False


def _redis() -> redis.Redis | None:
    global _client
    if _disabled:
        return None
    if _client is None:
        _client = redis.Redis.from_url(
            settings.redis_url, socket_connect_timeout=0.3, socket_timeout=0.3
        )
    return _client


def _disable() -> None:
    global _disabled
    _disabled = True


def cache_key(request: PackRequest) -> str:
    """对 (箱体 + 商品集合 + 时限) 归一化后哈希。"""
    items = sorted(
        (i.product_id, i.dimensions.length, i.dimensions.width, i.dimensions.height, i.quantity)
        for i in request.items
    )
    payload = {
        "bin": [
            request.bin.id,
            request.bin.dimensions.length,
            request.bin.dimensions.width,
            request.bin.dimensions.height,
        ],
        "items": items,
        "t": request.time_limit_ms,
    }
    raw = json.dumps(payload, sort_keys=True, default=str)
    return "solver:" + hashlib.sha256(raw.encode()).hexdigest()


def get_cached(key: str) -> PackResult | None:
    client = _redis()
    if client is None:
        return None
    try:
        raw = client.get(key)
    except Exception:  # noqa: BLE001  Redis 不可用 → 禁用并跳过
        _disable()
        return None
    return PackResult.model_validate_json(raw) if raw else None


def set_cached(key: str, result: PackResult, ttl: int = 3600) -> None:
    client = _redis()
    if client is None:
        return
    try:
        client.set(key, result.model_dump_json(), ex=ttl)
    except Exception:  # noqa: BLE001
        _disable()
