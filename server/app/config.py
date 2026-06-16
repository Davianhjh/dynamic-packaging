"""应用配置：从环境变量 / .env 读取。"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://packing:packing@localhost:5432/packing"
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


settings = Settings()
