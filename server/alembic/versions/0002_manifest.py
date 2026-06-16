"""phase4: manifest records

Revision ID: 0002_manifest
Revises: 0001_initial
Create Date: 2026-06-16

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002_manifest"
down_revision: str | None = "0001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "manifest_records",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("bin_id", sa.String(length=36), nullable=False),
        sa.Column("fill_rate", sa.Float(), nullable=False),
        sa.Column("lines", sa.JSON(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("manifest_records")
