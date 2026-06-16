"""共享 pydantic 基类与小工具。

约定：所有对外 API 的 JSON 使用 camelCase，与前端 TS 契约 (@packing/contract) 一致。
Python 侧属性保持 snake_case，靠别名生成器在边界转换。
"""

from __future__ import annotations

from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


def utcnow() -> datetime:
    return datetime.now(UTC)
