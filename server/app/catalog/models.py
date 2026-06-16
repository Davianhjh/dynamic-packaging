"""catalog 数据模型：商品 (含近似长宽高 mm)、库存、上下架状态、缩略图 URL。"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, Float, Integer, String, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base, new_uuid


class ProductStatus(StrEnum):
    ONLINE = "online"  # 上架
    OFFLINE = "offline"  # 下架


class Product(Base):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    # 近似长宽高 (mm)，对应共享契约 Dimensions(length->x, width->y, height->z)
    length_mm: Mapped[float] = mapped_column(Float, nullable=False)
    width_mm: Mapped[float] = mapped_column(Float, nullable=False)
    height_mm: Mapped[float] = mapped_column(Float, nullable=False)
    stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[ProductStatus] = mapped_column(
        SAEnum(
            ProductStatus,
            name="product_status",
            # 持久化枚举的“值”(online/offline) 而非默认的“名”，与迁移定义一致。
            values_callable=lambda enum: [member.value for member in enum],
        ),
        nullable=False,
        default=ProductStatus.OFFLINE,
    )
    thumbnail_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
