"""装箱共享契约 —— 后端 (Python / pydantic v2)

这是前后端唯一的几何 / 数据契约，必须与前端的 packing-contract.ts 保持同步。
任何对结构、单位、坐标系的修改都要两端一起改。

约定:
    - 单位: 毫米 (mm)，体积单位 mm³
    - 坐标原点: 箱体某一底角；x 沿长(length)、y 沿宽(width)、z 沿高(height, 向上)
    - position 表示物品轴对齐包围盒的“最小角”坐标 (min corner)
    - rotation_type: 0..5 共 6 种轴对齐朝向
"""

from __future__ import annotations

from enum import IntEnum

from pydantic import BaseModel, Field


class RotationType(IntEnum):
    """6 种轴对齐朝向；与前端 rotationType 0..5 一一对应。"""

    LWH = 0  # length->x, width->y, height->z
    WLH = 1
    HLW = 2
    HWL = 3
    LHW = 4
    WHL = 5


class Dimensions(BaseModel):
    length: float = Field(gt=0)  # 沿 x
    width: float = Field(gt=0)   # 沿 y
    height: float = Field(gt=0)  # 沿 z

    @property
    def volume(self) -> float:
        return self.length * self.width * self.height


class Vec3(BaseModel):
    x: float
    y: float
    z: float


class Bin(BaseModel):
    id: str
    name: str
    dimensions: Dimensions


class Product(BaseModel):
    id: str
    name: str
    dimensions: Dimensions
    thumbnail_url: str | None = None


class PackItem(BaseModel):
    product_id: str
    name: str
    dimensions: Dimensions
    quantity: int = Field(ge=1)


class Placement(BaseModel):
    instance_id: str
    product_id: str
    position: Vec3            # 轴对齐包围盒最小角，箱体坐标系
    rotation_type: RotationType
    footprint: Dimensions    # 旋转后的轴对齐尺寸


class Unplaced(BaseModel):
    product_id: str
    quantity: int


class PackResult(BaseModel):
    bin_id: str
    placements: list[Placement]
    placed_counts: dict[str, int]
    unplaced: list[Unplaced]
    occupied_volume: float
    total_volume: float
    remaining_volume: float
    fill_rate: float          # 0..1
    is_full: bool


class PackRequest(BaseModel):
    bin: Bin
    items: list[PackItem]                       # 已选全部商品 + 触发的新商品，整批
    time_limit_ms: int | None = Field(default=2500, ge=200)


class ManifestLine(BaseModel):
    product_id: str
    name: str
    quantity: int


class Manifest(BaseModel):
    bin_id: str
    lines: list[ManifestLine]
    fill_rate: float
