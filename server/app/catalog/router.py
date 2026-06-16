"""catalog: 商品 CRUD、上下架、库存维护、对内库存校验接口、上架商品列表。

写操作需 admin；上架列表与库存校验对内/装箱端开放。
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.auth.deps import require_admin
from app.catalog import service
from app.catalog.models import Product, ProductStatus
from app.catalog.schemas import (
    ProductCreate,
    ProductOut,
    ProductUpdate,
    StatusUpdate,
    StockCheckRequest,
    StockCheckResult,
    StockUpdate,
)
from app.db import get_db
from app.storage import upload_thumbnail

router = APIRouter(prefix="/api/catalog", tags=["catalog"])

DbDep = Annotated[Session, Depends(get_db)]
AdminDep = Depends(require_admin)


def _get_or_404(db: Session, product_id: str) -> Product:
    product = service.get_product(db, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="商品不存在")
    return product


# —— 装箱端 / 对内（无需 admin）——
@router.get("/products/on-shelf", response_model=list[ProductOut])
def list_on_shelf(db: DbDep) -> list[ProductOut]:
    products = service.list_products(db, ProductStatus.ONLINE)
    return [ProductOut.from_model(p) for p in products]


@router.post("/stock-check", response_model=StockCheckResult)
def stock_check(payload: StockCheckRequest, db: DbDep) -> StockCheckResult:
    return service.check_stock(db, payload)


# —— 管理后台（需 admin）——
@router.get("/products", response_model=list[ProductOut], dependencies=[AdminDep])
def list_all(db: DbDep, status: ProductStatus | None = None) -> list[ProductOut]:
    return [ProductOut.from_model(p) for p in service.list_products(db, status)]


@router.post("/products", response_model=ProductOut, status_code=201, dependencies=[AdminDep])
def create(payload: ProductCreate, db: DbDep) -> ProductOut:
    return ProductOut.from_model(service.create_product(db, payload))


@router.get("/products/{product_id}", response_model=ProductOut, dependencies=[AdminDep])
def get_one(product_id: str, db: DbDep) -> ProductOut:
    return ProductOut.from_model(_get_or_404(db, product_id))


@router.patch("/products/{product_id}", response_model=ProductOut, dependencies=[AdminDep])
def update(product_id: str, payload: ProductUpdate, db: DbDep) -> ProductOut:
    product = _get_or_404(db, product_id)
    return ProductOut.from_model(service.update_product(db, product, payload))


@router.delete("/products/{product_id}", status_code=204, dependencies=[AdminDep])
def delete(product_id: str, db: DbDep) -> None:
    service.delete_product(db, _get_or_404(db, product_id))


@router.patch("/products/{product_id}/status", response_model=ProductOut, dependencies=[AdminDep])
def update_status(product_id: str, payload: StatusUpdate, db: DbDep) -> ProductOut:
    product = _get_or_404(db, product_id)
    return ProductOut.from_model(service.set_status(db, product, payload.status))


@router.patch("/products/{product_id}/stock", response_model=ProductOut, dependencies=[AdminDep])
def update_stock(product_id: str, payload: StockUpdate, db: DbDep) -> ProductOut:
    product = _get_or_404(db, product_id)
    return ProductOut.from_model(service.set_stock(db, product, payload.stock))


@router.post(
    "/products/{product_id}/thumbnail", response_model=ProductOut, dependencies=[AdminDep]
)
def upload_product_thumbnail(
    product_id: str, db: DbDep, file: Annotated[UploadFile, File()]
) -> ProductOut:
    product = _get_or_404(db, product_id)
    data = file.file.read()
    url = upload_thumbnail(
        data,
        content_type=file.content_type or "application/octet-stream",
        filename=file.filename or "thumbnail",
    )
    product.thumbnail_url = url
    db.commit()
    db.refresh(product)
    return ProductOut.from_model(product)
