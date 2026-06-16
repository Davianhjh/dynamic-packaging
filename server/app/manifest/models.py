"""manifest 数据模型：已确认的装箱记录（仅记录，不扣减库存）。"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, Float, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base, new_uuid


class ManifestRecord(Base):
    __tablename__ = "manifest_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    bin_id: Mapped[str] = mapped_column(String(36), nullable=False)
    fill_rate: Mapped[float] = mapped_column(Float, nullable=False)
    # 清单行 [{product_id, name, quantity}, ...]，存 JSON。
    lines: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
