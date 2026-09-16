"""Persistent tracking and fixed program canvases v1.

Revision ID: 003
Revises: 002
"""

from datetime import UTC, datetime
from uuid import NAMESPACE_URL, uuid5

import sqlalchemy as sa

from alembic import op

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None

# Frozen migration data: do not import the evolving application catalog/models.
DEFINITIONS = {
    "Prototipado": [
        ("identity", "Identidad y dirección estratégica", "Estatutos, misión y visión."),
        ("business-model", "Modelo de negocio", "Forma de crear, entregar y capturar valor."),
        (
            "segmented-market",
            "Mercado segmentado",
            "Segmentos priorizados y comprensión de sus necesidades.",
        ),
        ("channels", "Canales definidos", "Canales para llegar a clientes y aliados."),
        ("mvp", "Producto mínimo viable", "Desarrollo y validación del MVP con usuarios."),
        (
            "incorporation",
            "Constitución de sociedad",
            "Formalización de la sociedad para avanzar de programa.",
        ),
    ],
    "Puesta en marcha": [
        (
            "business-model",
            "Modelo de negocio",
            "Validación y ajuste del modelo para la operación comercial.",
        ),
        (
            "brand-channels",
            "Marca y canales",
            "Branding y canales definidos para llegar al mercado.",
        ),
        (
            "marketing",
            "Marketing y comercialización",
            "Plan básico de marketing y ejecución comercial.",
        ),
        (
            "intellectual-property",
            "Protección de propiedad intelectual",
            "Protección y gestión de activos intelectuales aplicables.",
        ),
        (
            "operations",
            "Formalización y operaciones",
            "Constitución de sociedad y procesos operativos.",
        ),
        (
            "funding",
            "Financiamiento",
            "Plan de financiamiento para sostener la operación y el crecimiento.",
        ),
    ],
}


def record() -> list[sa.Column]:
    return [
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    ]


def editable() -> list[sa.Column]:
    return [
        *record(),
        sa.Column("revision", sa.Integer, nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
    ]


def cycle_ref() -> sa.Column:
    return sa.Column("cycle_id", sa.String(36), sa.ForeignKey("program_cycles.id"), nullable=False)


def pinned() -> list:
    return [
        sa.Column("cycle_id", sa.String(36), nullable=False),
        sa.Column("canvas_id", sa.String(36), nullable=False),
        sa.Column("entrepreneurship_id", sa.String(36), nullable=False),
        sa.ForeignKeyConstraint(
            ["cycle_id", "canvas_id", "entrepreneurship_id"],
            [
                "cycle_canvases.cycle_id",
                "cycle_canvases.canvas_id",
                "cycle_canvases.entrepreneurship_id",
            ],
        ),
        sa.UniqueConstraint("id", "cycle_id"),
        sa.CheckConstraint(
            "status IN ('draft', 'pending_validation', 'approved', 'correction_requested', 'rejected')"
        ),
        sa.CheckConstraint("revision > 0"),
    ]


def upgrade() -> None:
    canvases = op.create_table(
        "program_canvases",
        *record(),
        sa.Column("program", sa.String(64), nullable=False),
        sa.Column("version", sa.Integer, nullable=False),
        sa.UniqueConstraint("program", "version"),
        sa.CheckConstraint("version > 0"),
    )
    areas = op.create_table(
        "canvas_areas",
        *record(),
        sa.Column("canvas_id", sa.String(36), sa.ForeignKey("program_canvases.id"), nullable=False),
        sa.Column("key", sa.String(64), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("position", sa.Integer, nullable=False),
        sa.UniqueConstraint("id", "canvas_id"),
        sa.UniqueConstraint("canvas_id", "key"),
        sa.UniqueConstraint("canvas_id", "position"),
    )
    now = datetime.now(UTC)
    for program, definitions in DEFINITIONS.items():
        canvas_id = str(uuid5(NAMESPACE_URL, f"sia:canvas:{program}:1:canvas"))
        op.bulk_insert(
            canvases, [{"id": canvas_id, "program": program, "version": 1, "created_at": now}]
        )
        op.bulk_insert(
            areas,
            [
                {
                    "id": str(uuid5(NAMESPACE_URL, f"sia:canvas:{program}:1:{key}")),
                    "canvas_id": canvas_id,
                    "key": key,
                    "name": name,
                    "description": description,
                    "position": position,
                    "created_at": now,
                }
                for position, (key, name, description) in enumerate(definitions, 1)
            ],
        )
    op.create_table(
        "cycle_canvases",
        sa.Column("cycle_id", sa.String(36), sa.ForeignKey("program_cycles.id"), primary_key=True),
        sa.Column("canvas_id", sa.String(36), sa.ForeignKey("program_canvases.id"), nullable=False),
        sa.Column(
            "entrepreneurship_id",
            sa.String(36),
            sa.ForeignKey("entrepreneurships.id"),
            nullable=False,
        ),
        sa.UniqueConstraint("cycle_id", "canvas_id", "entrepreneurship_id"),
    )
    op.create_table(
        "ambitions",
        *editable(),
        sa.Column(
            "entrepreneurship_id",
            sa.String(36),
            sa.ForeignKey("entrepreneurships.id"),
            nullable=False,
        ),
        sa.UniqueConstraint("id", "entrepreneurship_id"),
    )
    op.create_table(
        "objectives",
        *editable(),
        *pinned(),
        sa.Column("area_id", sa.String(36), nullable=False),
        sa.Column("ambition_id", sa.String(36)),
        sa.Column("deliverable", sa.String(200)),
        sa.Column("status", sa.String(32), nullable=False),
        sa.ForeignKeyConstraint(
            ["area_id", "canvas_id"], ["canvas_areas.id", "canvas_areas.canvas_id"]
        ),
        sa.ForeignKeyConstraint(
            ["ambition_id", "entrepreneurship_id"],
            ["ambitions.id", "ambitions.entrepreneurship_id"],
        ),
    )
    op.create_table(
        "activities",
        *editable(),
        cycle_ref(),
        sa.Column("objective_id", sa.String(36), nullable=False),
        sa.Column("responsible_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("starts_on", sa.Date, nullable=False),
        sa.Column("ends_on", sa.Date, nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("id", "cycle_id"),
        sa.CheckConstraint("starts_on <= ends_on"),
        sa.CheckConstraint("revision > 0"),
        sa.ForeignKeyConstraint(
            ["objective_id", "cycle_id"], ["objectives.id", "objectives.cycle_id"]
        ),
    )
    op.create_table(
        "evidence_references",
        *record(),
        cycle_ref(),
        sa.Column("activity_id", sa.String(36), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("url", sa.String(2048), nullable=False),
        sa.Column("created_by", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.CheckConstraint("kind IN ('link', 'file', 'photograph', 'video')"),
        sa.ForeignKeyConstraint(
            ["activity_id", "cycle_id"], ["activities.id", "activities.cycle_id"]
        ),
    )
    op.create_table(
        "diagnostics",
        *record(),
        *pinned(),
        sa.Column("revision", sa.Integer, nullable=False),
        sa.Column("assessed_on", sa.Date, nullable=False),
        sa.Column("assessments", sa.JSON, nullable=False),
        sa.Column("supersedes_id", sa.String(36)),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("created_by", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.ForeignKeyConstraint(
            ["supersedes_id", "cycle_id"], ["diagnostics.id", "diagnostics.cycle_id"]
        ),
    )
    op.create_table(
        "tracking_validations",
        *record(),
        cycle_ref(),
        sa.Column("objective_id", sa.String(36)),
        sa.Column("diagnostic_id", sa.String(36)),
        sa.Column("actor_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("decision", sa.String(32), nullable=False),
        sa.Column("observation", sa.Text, nullable=False),
        sa.Column("entity_revision", sa.Integer, nullable=False),
        sa.Column("snapshot", sa.JSON, nullable=False),
        sa.ForeignKeyConstraint(
            ["objective_id", "cycle_id"], ["objectives.id", "objectives.cycle_id"]
        ),
        sa.ForeignKeyConstraint(
            ["diagnostic_id", "cycle_id"], ["diagnostics.id", "diagnostics.cycle_id"]
        ),
        sa.CheckConstraint("(objective_id IS NULL) <> (diagnostic_id IS NULL)"),
        sa.CheckConstraint("decision IN ('approve', 'request_correction', 'reject')"),
    )
    for table, columns in {
        "ambitions": ["entrepreneurship_id"],
        "objectives": ["cycle_id"],
        "activities": ["cycle_id", "objective_id"],
        "evidence_references": ["cycle_id", "activity_id"],
        "diagnostics": ["cycle_id"],
        "tracking_validations": ["cycle_id", "objective_id", "diagnostic_id"],
    }.items():
        for column in columns:
            op.create_index(f"ix_{table}_{column}", table, [column])
    if op.get_bind().dialect.name == "postgresql":
        _postgres_guards()


def _postgres_guards() -> None:
    op.execute("""
        CREATE FUNCTION seguimiento_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'Tracking historical record is immutable'; END $$;
    """)
    op.execute("""
        CREATE FUNCTION seguimiento_diagnostic_guard() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          IF OLD.status = 'approved' THEN
            RAISE EXCEPTION 'Approved diagnostic is immutable';
          END IF;
          RETURN NEW;
        END $$;
    """)
    op.execute("""
        CREATE FUNCTION seguimiento_scope_guard() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM program_cycles c
            JOIN program_enrollments e ON e.id = c.enrollment_id
            JOIN program_canvases p ON p.program = e.program
            WHERE c.id = NEW.cycle_id AND e.entrepreneurship_id = NEW.entrepreneurship_id
              AND p.id = NEW.canvas_id
          ) THEN RAISE EXCEPTION 'Canvas scope mismatch'; END IF;
          RETURN NEW;
        END $$;
    """)
    for table in (
        "program_canvases",
        "canvas_areas",
        "cycle_canvases",
        "evidence_references",
        "tracking_validations",
    ):
        op.execute(
            f"CREATE TRIGGER tracking_immutable BEFORE UPDATE OR DELETE ON {table} FOR EACH ROW EXECUTE FUNCTION seguimiento_immutable()"
        )
    for table in ("ambitions", "objectives", "activities", "diagnostics"):
        op.execute(
            f"CREATE TRIGGER tracking_no_delete BEFORE DELETE ON {table} FOR EACH ROW EXECUTE FUNCTION seguimiento_immutable()"
        )
    op.execute(
        "CREATE TRIGGER diagnostic_approved BEFORE UPDATE ON diagnostics FOR EACH ROW EXECUTE FUNCTION seguimiento_diagnostic_guard()"
    )
    op.execute(
        "CREATE TRIGGER canvas_scope BEFORE INSERT ON cycle_canvases FOR EACH ROW EXECUTE FUNCTION seguimiento_scope_guard()"
    )


def downgrade() -> None:
    for table in (
        "tracking_validations",
        "diagnostics",
        "evidence_references",
        "activities",
        "objectives",
        "ambitions",
        "cycle_canvases",
        "canvas_areas",
        "program_canvases",
    ):
        op.drop_table(table)
    if op.get_bind().dialect.name == "postgresql":
        for function in (
            "seguimiento_immutable",
            "seguimiento_diagnostic_guard",
            "seguimiento_scope_guard",
        ):
            op.execute(f"DROP FUNCTION {function}()")
