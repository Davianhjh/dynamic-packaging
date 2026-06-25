"""缩略图：上传后字节入库，公开端点可读回 (含 content-type)。"""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_thumbnail_upload_and_serve(client: TestClient, admin_headers: dict[str, str]) -> None:
    pid = client.post(
        "/api/catalog/products",
        json={
            "name": "带图商品",
            "dimensions": {"length": 100, "width": 100, "height": 100},
            "stock": 1,
            "status": "online",
        },
        headers=admin_headers,
    ).json()["id"]

    img = b"\x89PNG\r\n\x1a\n-fake-image-bytes-\x00\x01\x02"
    up = client.post(
        f"/api/catalog/products/{pid}/thumbnail",
        files={"file": ("t.png", img, "image/png")},
        headers=admin_headers,
    )
    assert up.status_code == 200, up.text
    assert up.json()["thumbnailUrl"] == f"/api/catalog/products/{pid}/thumbnail"

    # 读取端点公开，无需鉴权
    served = client.get(f"/api/catalog/products/{pid}/thumbnail")
    assert served.status_code == 200
    assert served.content == img
    assert served.headers["content-type"] == "image/png"
