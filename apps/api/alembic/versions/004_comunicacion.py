"""comunicacion

Revision ID: 004
Revises: 003
Create Date: 2026-09-16 11:18:10.515206

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "004"
down_revision: str | None = "003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "alerts",
        sa.Column("entrepreneurship_id", sa.String(length=36), nullable=False),
        sa.Column("cycle_id", sa.String(length=36), nullable=True),
        sa.Column("recipient_id", sa.String(length=36), nullable=False),
        sa.Column("kind", sa.String(length=40), nullable=False),
        sa.Column("detail", sa.Text(), nullable=False),
        sa.Column("source_key", sa.String(length=200), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["cycle_id"],
            ["program_cycles.id"],
        ),
        sa.ForeignKeyConstraint(
            ["entrepreneurship_id"],
            ["entrepreneurships.id"],
        ),
        sa.ForeignKeyConstraint(
            ["recipient_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_key"),
    )
    op.create_index(op.f("ix_alerts_cycle_id"), "alerts", ["cycle_id"], unique=False)
    op.create_index(
        op.f("ix_alerts_entrepreneurship_id"), "alerts", ["entrepreneurship_id"], unique=False
    )
    op.create_index(op.f("ix_alerts_recipient_id"), "alerts", ["recipient_id"], unique=False)
    op.create_table(
        "channels",
        sa.Column("entrepreneurship_id", sa.String(length=36), nullable=False),
        sa.Column("cycle_id", sa.String(length=36), nullable=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("created_by", sa.String(length=36), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["cycle_id"],
            ["program_cycles.id"],
        ),
        sa.ForeignKeyConstraint(
            ["entrepreneurship_id"],
            ["entrepreneurships.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_channels_cycle_id"), "channels", ["cycle_id"], unique=False)
    op.create_index(
        op.f("ix_channels_entrepreneurship_id"), "channels", ["entrepreneurship_id"], unique=False
    )
    op.create_table(
        "meetings",
        sa.Column("cycle_id", sa.String(length=36), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("participants", sa.JSON(), nullable=False),
        sa.Column("reference_url", sa.Text(), nullable=True),
        sa.Column("created_by", sa.String(length=36), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["cycle_id"],
            ["program_cycles.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_meetings_cycle_id"), "meetings", ["cycle_id"], unique=False)
    op.create_table(
        "agreements",
        sa.Column("meeting_id", sa.String(length=36), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("responsible_id", sa.String(length=36), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("next_steps", sa.Text(), nullable=False),
        sa.Column("created_by", sa.String(length=36), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["meeting_id"],
            ["meetings.id"],
        ),
        sa.ForeignKeyConstraint(
            ["responsible_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_agreements_meeting_id"), "agreements", ["meeting_id"], unique=False)
    op.create_table(
        "channel_messages",
        sa.Column("channel_id", sa.String(length=36), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_by", sa.String(length=36), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["channel_id"],
            ["channels.id"],
        ),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("id", "channel_id", name="uq_message_channel"),
    )
    op.create_index(
        op.f("ix_channel_messages_channel_id"), "channel_messages", ["channel_id"], unique=False
    )
    op.create_table(
        "meeting_minutes",
        sa.Column("meeting_id", sa.String(length=36), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("origin", sa.String(length=20), nullable=False),
        sa.Column("source_transcript", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("reviewed_by", sa.String(length=36), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.String(length=36), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "origin != 'ia_borrador' OR source_transcript IS NOT NULL", name="ck_minutes_source"
        ),
        sa.CheckConstraint("origin IN ('manual', 'ia_borrador')", name="ck_minutes_origin"),
        sa.CheckConstraint(
            "status != 'aprobada' OR (reviewed_by IS NOT NULL AND approved_at IS NOT NULL AND revoked_at IS NULL)",
            name="ck_minutes_review",
        ),
        sa.CheckConstraint("status IN ('borrador', 'aprobada')", name="ck_minutes_status"),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["meeting_id"],
            ["meetings.id"],
        ),
        sa.ForeignKeyConstraint(
            ["reviewed_by"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_meeting_minutes_meeting_id"), "meeting_minutes", ["meeting_id"], unique=False
    )
    op.create_table(
        "notifications",
        sa.Column("alert_id", sa.String(length=36), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["alert_id"],
            ["alerts.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("alert_id"),
    )
    op.create_table(
        "chat_mentions",
        sa.Column("message_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["message_id"],
            ["channel_messages.id"],
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("message_id", "user_id", name="uq_mention_user"),
    )
    op.create_index(
        op.f("ix_chat_mentions_message_id"), "chat_mentions", ["message_id"], unique=False
    )
    op.create_index(op.f("ix_chat_mentions_user_id"), "chat_mentions", ["user_id"], unique=False)
    op.create_table(
        "chat_read_receipts",
        sa.Column("channel_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("last_read_message_id", sa.String(length=36), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["channel_id"],
            ["channels.id"],
        ),
        sa.ForeignKeyConstraint(
            ["last_read_message_id", "channel_id"],
            ["channel_messages.id", "channel_messages.channel_id"],
            name="fk_receipt_message_channel",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("channel_id", "user_id", name="uq_receipt_user"),
    )
    op.create_index(
        op.f("ix_chat_read_receipts_channel_id"), "chat_read_receipts", ["channel_id"], unique=False
    )
    install_guards()


def downgrade() -> None:
    op.drop_index(op.f("ix_chat_read_receipts_channel_id"), table_name="chat_read_receipts")
    op.drop_table("chat_read_receipts")
    op.drop_index(op.f("ix_chat_mentions_user_id"), table_name="chat_mentions")
    op.drop_index(op.f("ix_chat_mentions_message_id"), table_name="chat_mentions")
    op.drop_table("chat_mentions")
    op.drop_table("notifications")
    op.drop_index(op.f("ix_meeting_minutes_meeting_id"), table_name="meeting_minutes")
    op.drop_table("meeting_minutes")
    op.drop_index(op.f("ix_channel_messages_channel_id"), table_name="channel_messages")
    op.drop_table("channel_messages")
    op.drop_index(op.f("ix_agreements_meeting_id"), table_name="agreements")
    op.drop_table("agreements")
    op.drop_index(op.f("ix_meetings_cycle_id"), table_name="meetings")
    op.drop_table("meetings")
    op.drop_index(op.f("ix_channels_entrepreneurship_id"), table_name="channels")
    op.drop_index(op.f("ix_channels_cycle_id"), table_name="channels")
    op.drop_table("channels")
    op.drop_index(op.f("ix_alerts_recipient_id"), table_name="alerts")
    op.drop_index(op.f("ix_alerts_entrepreneurship_id"), table_name="alerts")
    op.drop_index(op.f("ix_alerts_cycle_id"), table_name="alerts")
    op.drop_table("alerts")
    if op.get_bind().dialect.name == "postgresql":
        op.execute("DROP FUNCTION communication_history_guard()")
        op.execute("DROP FUNCTION communication_scope_guard()")


# Frozen migration rules: only communication tables acquire triggers.
TABLE_SCOPE = {
    "meetings": ["cycle_id", "created_by"],
    "meeting_minutes": ["meeting_id", "created_by", "origin", "source_transcript"],
    "agreements": ["meeting_id", "created_by"],
    "channels": ["entrepreneurship_id", "cycle_id", "created_by"],
    "channel_messages": ["channel_id", "created_by"],
    "chat_mentions": ["message_id", "user_id"],
    "chat_read_receipts": ["channel_id", "user_id"],
    "alerts": ["entrepreneurship_id", "cycle_id", "recipient_id", "source_key"],
    "notifications": ["alert_id"],
}


def install_guards() -> None:
    postgres = op.get_bind().dialect.name == "postgresql"
    if postgres:
        op.execute("""
        CREATE FUNCTION communication_history_guard() RETURNS trigger AS $$
        DECLARE col text;
        BEGIN
          IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Communication history cannot be deleted'; END IF;
          IF TG_TABLE_NAME = 'meeting_minutes' AND to_jsonb(OLD)->>'status' = 'aprobada'
            THEN RAISE EXCEPTION 'Approved minutes are immutable'; END IF;
          FOREACH col IN ARRAY TG_ARGV LOOP
            IF to_jsonb(NEW)->col IS DISTINCT FROM to_jsonb(OLD)->col
              THEN RAISE EXCEPTION 'Communication ownership/source is immutable'; END IF;
          END LOOP;
          RETURN NEW;
        END; $$ LANGUAGE plpgsql
        """)
        op.execute("""
        CREATE FUNCTION communication_scope_guard() RETURNS trigger AS $$
        BEGIN
          IF NEW.cycle_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM program_cycles c JOIN program_enrollments e ON e.id = c.enrollment_id
            WHERE c.id = NEW.cycle_id AND e.entrepreneurship_id = NEW.entrepreneurship_id
          ) THEN RAISE EXCEPTION 'Communication cycle does not belong to entrepreneurship'; END IF;
          RETURN NEW;
        END; $$ LANGUAGE plpgsql
        """)
    for table, columns in TABLE_SCOPE.items():
        frozen = ["id", "created_at", *columns]
        if postgres:
            arguments = ", ".join(f"'{column}'" for column in frozen)
            op.execute(
                f"CREATE TRIGGER {table}_history BEFORE UPDATE OR DELETE ON {table} FOR EACH ROW EXECUTE FUNCTION communication_history_guard({arguments})"
            )
        else:
            changed = " OR ".join(f"NEW.{column} IS NOT OLD.{column}" for column in frozen)
            if table == "meeting_minutes":
                changed += " OR OLD.status = 'aprobada'"
            op.execute(
                f"CREATE TRIGGER {table}_history_update BEFORE UPDATE ON {table} WHEN {changed} BEGIN SELECT RAISE(ABORT, 'Communication history is immutable'); END"
            )
            op.execute(
                f"CREATE TRIGGER {table}_history_delete BEFORE DELETE ON {table} BEGIN SELECT RAISE(ABORT, 'Communication history cannot be deleted'); END"
            )
    for table in ["channels", "alerts"]:
        if postgres:
            op.execute(
                f"CREATE TRIGGER {table}_scope BEFORE INSERT OR UPDATE ON {table} FOR EACH ROW EXECUTE FUNCTION communication_scope_guard()"
            )
        else:
            op.execute(f"""CREATE TRIGGER {table}_scope BEFORE INSERT ON {table}
              WHEN NEW.cycle_id IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM program_cycles c JOIN program_enrollments e ON e.id = c.enrollment_id
                WHERE c.id = NEW.cycle_id AND e.entrepreneurship_id = NEW.entrepreneurship_id
              ) BEGIN SELECT RAISE(ABORT, 'Invalid communication scope'); END""")
