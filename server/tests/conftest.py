"""测试装置：临时 SQLite + 真实 Alembic 迁移，跑完整 API 流程 (不依赖 Postgres/MinIO)。

用迁移而非 create_all 建表，可顺带校验“迁移与模型一致”(尤其枚举取值)。
DATABASE_URL 必须在导入 app 之前设定，故 app 相关导入延迟到 fixture 内完成。
"""

from __future__ import annotations

import os
import tempfile
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

_SERVER_DIR = Path(__file__).resolve().parent.parent
_TEST_DB = Path(tempfile.gettempdir()) / "packing_phase1_test.db"


@pytest.fixture(scope="session")
def client() -> Iterator[TestClient]:
    if _TEST_DB.exists():
        _TEST_DB.unlink()
    os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB.as_posix()}"
    os.environ["SOLVER_USE_POOL"] = "false"  # 测试内联执行，不起进程池

    from alembic.config import Config

    from alembic import command

    cfg = Config(str(_SERVER_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(_SERVER_DIR / "alembic"))
    command.upgrade(cfg, "head")

    from app.main import app

    with TestClient(app) as c:  # 触发 lifespan：播种 admin (MinIO 未起则跳过)
        yield c


@pytest.fixture(scope="session")
def admin_headers(client: TestClient) -> dict[str, str]:
    resp = client.post("/api/auth/login", json={"username": "admin", "password": "admin"})
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['accessToken']}"}
