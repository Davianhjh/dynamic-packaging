"""manifest API schemas (camelCase 边界)。"""

from __future__ import annotations

from datetime import datetime

from app.common import CamelModel
from app.contract.packing_contract import ManifestLine
from app.manifest.models import ManifestRecord


class ManifestRecordOut(CamelModel):
    id: str
    bin_id: str
    lines: list[ManifestLine]
    fill_rate: float
    created_at: datetime

    @classmethod
    def from_record(cls, r: ManifestRecord) -> ManifestRecordOut:
        return cls(
            id=r.id,
            bin_id=r.bin_id,
            lines=[ManifestLine.model_validate(d) for d in r.lines],
            fill_rate=r.fill_rate,
            created_at=r.created_at,
        )
