"""应用配置：从环境变量 / .env 读取。"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict

from app.contract.packing_contract import DEFAULT_BIN, Bin, Dimensions


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://postgres:114432@localhost:5432/dynamic-packaging"
    redis_url: str = "redis://localhost:6379/0"

    s3_endpoint: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket: str = "thumbnails"

    jwt_secret: str = "dev-secret-change-me-please-override-32+chars"
    access_token_expire_minutes: int = 720

    # 首次启动若无用户则按此创建管理员 (生产环境务必修改)。
    admin_username: str = "admin"
    admin_password: str = "admin"

    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
    ]

    # 单一固定箱体内部可用尺寸 (mm)，默认取共享契约 DEFAULT_BIN，可经环境变量覆盖
    # (BIN_LENGTH_MM / BIN_WIDTH_MM / BIN_HEIGHT_MM)。
    bin_length_mm: float = DEFAULT_BIN.dimensions.length
    bin_width_mm: float = DEFAULT_BIN.dimensions.width
    bin_height_mm: float = DEFAULT_BIN.dimensions.height

    # solver：进程池避免在 API 线程内同步计算；测试可关 (SOLVER_USE_POOL=false)。
    solver_use_pool: bool = True
    solver_pool_workers: int = 2

    @property
    def fixed_bin(self) -> Bin:
        """当前生效的固定箱体（默认 = 契约常量，环境变量可覆盖）。"""
        return Bin(
            id=DEFAULT_BIN.id,
            name=f"固定箱体 {self.bin_length_mm:g}×{self.bin_width_mm:g}×{self.bin_height_mm:g}",
            dimensions=Dimensions(
                length=self.bin_length_mm,
                width=self.bin_width_mm,
                height=self.bin_height_mm,
            ),
        )


settings = Settings()
