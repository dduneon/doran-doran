"""add location to flights and accommodations

Revision ID: c3a9f1b2d4e5
Revises: 86e78a4f67aa
Create Date: 2026-04-17 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c3a9f1b2d4e5"
down_revision: Union[str, None] = "86e78a4f67aa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("flights", "departure_airport", type_=sa.String(300))
    op.alter_column("flights", "arrival_airport", type_=sa.String(300))
    op.add_column("flights", sa.Column("departure_lat", sa.Float(), nullable=True))
    op.add_column("flights", sa.Column("departure_lng", sa.Float(), nullable=True))
    op.add_column("flights", sa.Column("departure_place_id", sa.String(500), nullable=True))
    op.add_column("flights", sa.Column("arrival_lat", sa.Float(), nullable=True))
    op.add_column("flights", sa.Column("arrival_lng", sa.Float(), nullable=True))
    op.add_column("flights", sa.Column("arrival_place_id", sa.String(500), nullable=True))

    op.add_column("accommodations", sa.Column("lat", sa.Float(), nullable=True))
    op.add_column("accommodations", sa.Column("lng", sa.Float(), nullable=True))
    op.add_column("accommodations", sa.Column("place_id", sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column("flights", "departure_lat")
    op.drop_column("flights", "departure_lng")
    op.drop_column("flights", "departure_place_id")
    op.drop_column("flights", "arrival_lat")
    op.drop_column("flights", "arrival_lng")
    op.drop_column("flights", "arrival_place_id")
    op.alter_column("flights", "departure_airport", type_=sa.String(10))
    op.alter_column("flights", "arrival_airport", type_=sa.String(10))

    op.drop_column("accommodations", "lat")
    op.drop_column("accommodations", "lng")
    op.drop_column("accommodations", "place_id")
