"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-10-09

Baseline of the schema previously created by Base.metadata.create_all().
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "assets",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("facility", sa.String(), nullable=False),
        sa.Column("manufacturer", sa.String(), nullable=True),
        sa.Column("install_date", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "sensor_readings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("timestamp", sa.DateTime(), nullable=True),
        sa.Column("vibration", sa.Float(), nullable=True),
        sa.Column("temperature", sa.Float(), nullable=True),
        sa.Column("pressure", sa.Float(), nullable=True),
        sa.Column("runtime_hours", sa.Float(), nullable=True),
        sa.Column("rpm", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_sensor_readings_asset_id", "sensor_readings", ["asset_id"])
    op.create_index("ix_sensor_readings_timestamp", "sensor_readings", ["timestamp"])

    op.create_table(
        "predictions",
        sa.Column("asset_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("failure_probability", sa.Float(), nullable=False),
        sa.Column("health_score", sa.Float(), nullable=False),
        sa.Column("risk_level", sa.String(), nullable=False),
        sa.Column("predicted_failure_date", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"]),
        sa.PrimaryKeyConstraint("asset_id"),
    )

    op.create_table(
        "alerts",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("message", sa.String(), nullable=False),
        sa.Column("severity", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("acknowledged", sa.Boolean(), nullable=True),
        sa.Column("acknowledged_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_alerts_asset_id", "alerts", ["asset_id"])
    op.create_index("ix_alerts_created_at", "alerts", ["created_at"])

    op.create_table(
        "maintenance_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("date", sa.DateTime(), nullable=True),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("technician", sa.String(), nullable=True),
        sa.Column("cost", sa.Float(), nullable=True),
        sa.Column("downtime", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_maintenance_logs_asset_id", "maintenance_logs", ["asset_id"])
    op.create_index("ix_maintenance_logs_date", "maintenance_logs", ["date"])


def downgrade() -> None:
    op.drop_table("maintenance_logs")
    op.drop_table("alerts")
    op.drop_table("predictions")
    op.drop_table("sensor_readings")
    op.drop_table("assets")
    op.drop_table("users")
