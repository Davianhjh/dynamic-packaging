"""phase-fix: product thumbnail bytes in db

Revision ID: 0003_product_thumbnail
Revises: 0002_manifest
Create Date: 2026-06-24

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0003_product_thumbnail"
down_revision: str | None = "0002_manifest"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("products", sa.Column("thumbnail", sa.LargeBinary(), nullable=True))
    op.add_column(
        "products", sa.Column("thumbnail_content_type", sa.String(length=100), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("products", "thumbnail_content_type")
    op.drop_column("products", "thumbnail")
