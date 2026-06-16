"""catalog API schemas (camelCase 边界)。dimensions 复用共享契约的 Dimensions。"""

from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.catalog.models import Product, ProductStatus
from app.common import CamelModel
from app.contract.packing_contract import Dimensions


class ProductCreate(CamelModel):
    name: str = Field(min_length=1, max_length=200)
    dimensions: Dimensions
    stock: int = Field(default=0, ge=0)
    status: ProductStatus = ProductStatus.OFFLINE
    thumbnail_url: str | None = None


class ProductUpdate(CamelModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    dimensions: Dimensions | None = None
    stock: int | None = Field(default=None, ge=0)
    status: ProductStatus | None = None
    thumbnail_url: str | None = None


class ProductOut(CamelModel):
    id: str
    name: str
    dimensions: Dimensions
    stock: int
    status: ProductStatus
    thumbnail_url: str | None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_model(cls, p: Product) -> ProductOut:
        return cls(
            id=p.id,
            name=p.name,
            dimensions=Dimensions(length=p.length_mm, width=p.width_mm, height=p.height_mm),
            stock=p.stock,
            status=p.status,
            thumbnail_url=p.thumbnail_url,
            created_at=p.created_at,
            updated_at=p.updated_at,
        )


class StockUpdate(CamelModel):
    stock: int = Field(ge=0)


class StatusUpdate(CamelModel):
    status: ProductStatus


# —— 对内库存校验 (manifest 确认清单时调用) ——
class StockCheckItem(CamelModel):
    product_id: str
    quantity: int = Field(ge=1)


class StockCheckRequest(CamelModel):
    items: list[StockCheckItem]


class StockConflict(CamelModel):
    product_id: str
    requested: int
    available: int


class StockCheckResult(CamelModel):
    ok: bool
    conflicts: list[StockConflict]
