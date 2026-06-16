"""Phase 1 端到端：鉴权 + 商品 CRUD + 上下架 + 库存 + 库存校验 (camelCase 边界)。"""

from __future__ import annotations

from typing import Any


def test_login_and_me(client: Any, admin_headers: dict[str, str]) -> None:
    resp = client.get("/api/auth/me", headers=admin_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["username"] == "admin"
    assert body["role"] == "admin"


def test_login_bad_password(client: Any) -> None:
    resp = client.post("/api/auth/login", json={"username": "admin", "password": "wrong"})
    assert resp.status_code == 401


def test_products_require_admin(client: Any) -> None:
    assert client.get("/api/catalog/products").status_code == 401


def test_product_crud_flow(client: Any, admin_headers: dict[str, str]) -> None:
    payload = {
        "name": "测试盒",
        "dimensions": {"length": 200, "width": 150, "height": 100},
        "stock": 5,
    }
    resp = client.post("/api/catalog/products", json=payload, headers=admin_headers)
    assert resp.status_code == 201, resp.text
    product = resp.json()
    pid = product["id"]
    assert product["status"] == "offline"
    assert product["dimensions"]["length"] == 200
    assert product["thumbnailUrl"] is None  # camelCase 边界

    # 未上架 → 装箱端 on-shelf 看不到
    assert client.get("/api/catalog/products/on-shelf").json() == []

    # 上架
    resp = client.patch(
        f"/api/catalog/products/{pid}/status", json={"status": "online"}, headers=admin_headers
    )
    assert resp.json()["status"] == "online"
    on_shelf = client.get("/api/catalog/products/on-shelf").json()
    assert [p["id"] for p in on_shelf] == [pid]

    # 改库存为 2
    resp = client.patch(
        f"/api/catalog/products/{pid}/stock", json={"stock": 2}, headers=admin_headers
    )
    assert resp.json()["stock"] == 2

    # 库存校验：3 > 2 冲突；2 == 2 通过 (请求体用 camelCase productId)
    conflict = client.post(
        "/api/catalog/stock-check", json={"items": [{"productId": pid, "quantity": 3}]}
    ).json()
    assert conflict["ok"] is False
    assert conflict["conflicts"][0]["available"] == 2

    ok = client.post(
        "/api/catalog/stock-check", json={"items": [{"productId": pid, "quantity": 2}]}
    ).json()
    assert ok["ok"] is True

    # 更新名称
    resp = client.patch(
        f"/api/catalog/products/{pid}", json={"name": "改名盒"}, headers=admin_headers
    )
    assert resp.json()["name"] == "改名盒"

    # 删除
    assert client.delete(f"/api/catalog/products/{pid}", headers=admin_headers).status_code == 204
    assert client.get(f"/api/catalog/products/{pid}", headers=admin_headers).status_code == 404
