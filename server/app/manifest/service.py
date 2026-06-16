"""manifest 业务：确认清单。

确认时（且仅此时）由 manifest 向 catalog 做一次性库存校验；装箱过程不做库存判断。
业务决策：确认成功后仅记录，不扣减/预占库存。
"""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.catalog import service as catalog_service
from app.catalog.schemas import StockCheckItem, StockCheckRequest
from app.contract.packing_contract import Manifest
from app.manifest.models import ManifestRecord


def confirm(db: Session, payload: Manifest) -> ManifestRecord:
    if not payload.lines:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="清单为空")

    # 确认时一次性库存校验（装箱过程不做）。
    check = catalog_service.check_stock(
        db,
        StockCheckRequest(
            items=[
                StockCheckItem(product_id=line.product_id, quantity=line.quantity)
                for line in payload.lines
            ]
        ),
    )
    if not check.ok:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "库存不足，无法确认",
                "conflicts": [c.model_dump(by_alias=True) for c in check.conflicts],
            },
        )

    # 仅记录，不扣减/预占库存（业务开关，默认仅记录）。
    record = ManifestRecord(
        bin_id=payload.bin_id,
        fill_rate=payload.fill_rate,
        lines=[line.model_dump() for line in payload.lines],
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
