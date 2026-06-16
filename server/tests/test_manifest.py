"""manifest 确认：库存充足保存记录；不足返回 409 冲突明细 (camelCase)。"""

from __future__ import annotations

from fastapi.testclient import TestClient


def _make_product(client: TestClient, headers: dict[str, str], stock: int) -> str:
    resp = client.post(
        "/api/catalog/products",
        json={
            "name": "清单测试盒",
            "dimensions": {"length": 100, "width": 100, "height": 100},
            "stock": stock,
            "status": "online",
        },
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def test_confirm_within_stock(client: TestClient, admin_headers: dict[str, str]) -> None:
    pid = _make_product(client, admin_headers, stock=5)
    resp = client.post(
        "/api/manifest/confirm",
        json={
            "binId": "bin-default",
            "lines": [{"productId": pid, "name": "清单测试盒", "quantity": 3}],
            "fillRate": 0.1,
        },
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["id"]
    assert body["lines"][0]["quantity"] == 3
    assert body["binId"] == "bin-default"


def test_confirm_insufficient_stock(client: TestClient, admin_headers: dict[str, str]) -> None:
    pid = _make_product(client, admin_headers, stock=2)
    resp = client.post(
        "/api/manifest/confirm",
        json={
            "binId": "bin-default",
            "lines": [{"productId": pid, "name": "清单测试盒", "quantity": 5}],
            "fillRate": 0.1,
        },
    )
    assert resp.status_code == 409
    conflicts = resp.json()["detail"]["conflicts"]
    assert conflicts[0]["productId"] == pid
    assert conflicts[0]["requested"] == 5
    assert conflicts[0]["available"] == 2


def test_confirm_empty_rejected(client: TestClient) -> None:
    resp = client.post(
        "/api/manifest/confirm",
        json={"binId": "bin-default", "lines": [], "fillRate": 0.0},
    )
    assert resp.status_code == 400
