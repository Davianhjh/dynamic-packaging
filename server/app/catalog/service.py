"""catalog 业务：商品 CRUD、上下架、库存维护、对内库存校验。"""

from __future__ import annotations

from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.catalog.models import Product, ProductStatus
from app.catalog.schemas import (
    ProductCreate,
    ProductUpdate,
    StockCheckRequest,
    StockCheckResult,
    StockConflict,
)


def list_products(db: Session, status: ProductStatus | None = None) -> list[Product]:
    stmt = select(Product).order_by(Product.created_at.desc())
    if status is not None:
        stmt = stmt.where(Product.status == status)
    return list(db.scalars(stmt).all())


def get_product(db: Session, product_id: str) -> Product | None:
    return db.get(Product, product_id)


def create_product(db: Session, data: ProductCreate) -> Product:
    product = Product(
        name=data.name,
        length_mm=data.dimensions.length,
        width_mm=data.dimensions.width,
        height_mm=data.dimensions.height,
        stock=data.stock,
        status=data.status,
        thumbnail_url=data.thumbnail_url,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def update_product(db: Session, product: Product, data: ProductUpdate) -> Product:
    if data.name is not None:
        product.name = data.name
    if data.dimensions is not None:
        product.length_mm = data.dimensions.length
        product.width_mm = data.dimensions.width
        product.height_mm = data.dimensions.height
    if data.stock is not None:
        product.stock = data.stock
    if data.status is not None:
        product.status = data.status
    if data.thumbnail_url is not None:
        product.thumbnail_url = data.thumbnail_url
    db.commit()
    db.refresh(product)
    return product


def set_status(db: Session, product: Product, status: ProductStatus) -> Product:
    product.status = status
    db.commit()
    db.refresh(product)
    return product


def set_stock(db: Session, product: Product, stock: int) -> Product:
    product.stock = stock
    db.commit()
    db.refresh(product)
    return product


def delete_product(db: Session, product: Product) -> None:
    db.delete(product)
    db.commit()


def check_stock(db: Session, req: StockCheckRequest) -> StockCheckResult:
    """对内库存校验：仅在 manifest 确认清单时调用。纯查询，不扣减。"""
    requested: dict[str, int] = defaultdict(int)
    for item in req.items:
        requested[item.product_id] += item.quantity

    conflicts: list[StockConflict] = []
    for product_id, qty in requested.items():
        product = db.get(Product, product_id)
        available = product.stock if product is not None else 0
        if product is None or available < qty:
            conflicts.append(
                StockConflict(product_id=product_id, requested=qty, available=available)
            )
    return StockCheckResult(ok=not conflicts, conflicts=conflicts)
