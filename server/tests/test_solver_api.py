"""solver HTTP 端点：camelCase 进出 + 线程回退执行 (SOLVER_USE_POOL=false)。"""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_solve_endpoint(client: TestClient) -> None:
    body = {
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
    resp = client.post("/api/solver/solve", json=body)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["binId"] == "bin-default"  # camelCase 响应
    assert sum(data["placedCounts"].values()) == 4
    assert 0 < data["fillRate"] <= 1
    assert data["placements"][0]["rotationType"] in (0, 1, 2, 3, 4, 5)
