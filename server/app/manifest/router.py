"""manifest: 清单确认（确认时库存校验，仅记录不扣减）。"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.contract.packing_contract import Manifest
from app.db import get_db
from app.manifest import service
from app.manifest.schemas import ManifestRecordOut

router = APIRouter(prefix="/api/manifest", tags=["manifest"])


@router.post("/confirm", response_model=ManifestRecordOut)
def confirm(payload: Manifest, db: Annotated[Session, Depends(get_db)]) -> ManifestRecordOut:
    return ManifestRecordOut.from_record(service.confirm(db, payload))
