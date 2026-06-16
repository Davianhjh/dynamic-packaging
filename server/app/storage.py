"""对象存储 (MinIO / S3)：商品缩略图。图不入库，只存 URL。"""

from __future__ import annotations

import json
from typing import Any

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from app.config import settings
from app.db import new_uuid

# 快速失败：基础设施未就绪时不长时间阻塞 (应用启动 / 测试)。
_S3_CONFIG = Config(
    signature_version="s3v4",
    connect_timeout=2,
    read_timeout=5,
    retries={"max_attempts": 1},
)


def _client() -> Any:
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name="us-east-1",
        config=_S3_CONFIG,
    )


def ensure_bucket() -> None:
    """建桶 (幂等) 并设为公开读，便于浏览器直接显示缩略图。"""
    client = _client()
    try:
        client.head_bucket(Bucket=settings.s3_bucket)
    except ClientError:
        client.create_bucket(Bucket=settings.s3_bucket)
    policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {"AWS": ["*"]},
                "Action": ["s3:GetObject"],
                "Resource": [f"arn:aws:s3:::{settings.s3_bucket}/*"],
            }
        ],
    }
    client.put_bucket_policy(Bucket=settings.s3_bucket, Policy=json.dumps(policy))


def upload_thumbnail(data: bytes, content_type: str, filename: str) -> str:
    key = f"{new_uuid()}-{filename}"
    _client().put_object(
        Bucket=settings.s3_bucket, Key=key, Body=data, ContentType=content_type
    )
    return f"{settings.s3_endpoint}/{settings.s3_bucket}/{key}"
