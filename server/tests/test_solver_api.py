"""solver HTTP 端点：camelCase 进出 + 线程回退执行 (SOLVER_USE_POOL=false) + 超时降级。"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.contract.packing_contract import PackRequest, PackResult

_BODY = {
    "bin": {
        "id": "bin-default",
        "name": "t",
        "dimensions": {"length": 600, "width": 400, "height": 400},
    },
    "items": [
        {
            "productId": "a",
            "name": "A",
            "dimensions": {"length": 200, "width": 200, "height": 200},
            "quantity": 4,
        }
    ],
    "timeLimitMs": 800,
}


def test_solve_endpoint(client: TestClient) -> None:
    resp = client.post("/api/solver/solve", json=_BODY)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["binId"] == "bin-default"  # camelCase 响应
    assert sum(data["placedCounts"].values()) == 4
    assert 0 < data["fillRate"] <= 1
    assert data["placements"][0]["rotationType"] in (0, 1, 2, 3, 4, 5)


def test_solve_endpoint_degrades_on_timeout(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def _raise_timeout(_request: PackRequest) -> PackResult:
        raise TimeoutError

    monkeypatch.setattr("app.solver.router.run_solve", _raise_timeout)
    resp = client.post("/api/solver/solve", json=_BODY)
    assert resp.status_code == 200, resp.text  # 不是 504：降级而非报错
    assert sum(resp.json()["placedCounts"].values()) == 4


def test_solve_ws(client: TestClient) -> None:
    with client.websocket_connect("/api/solver/ws") as ws:
        ws.send_json(_BODY)
        data = ws.receive_json()
    assert data["binId"] == "bin-default"  # camelCase 推送
    assert sum(data["placedCounts"].values()) == 4
