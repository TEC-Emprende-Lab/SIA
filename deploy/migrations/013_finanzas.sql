-- Finanzas de Prototipado — US-PRO-003/007–010.
-- Alternativa manual para PostgreSQL que YA está en Alembic 012.
-- Recomendado: scripts/release.sh de la imagen nueva de la API.
-- Respaldar primero. Ejecutar una sola vez, sin dividir este archivo.
-- No usar si se aplicó otra migración financiera experimental.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM alembic_version WHERE version_num = '012')
     OR (SELECT count(*) FROM alembic_version) <> 1 THEN
    RAISE EXCEPTION 'Finanzas requiere Alembic 012 exacto. Use alembic upgrade head para aplicar la cadena completa.';
  END IF;
END $$;

CREATE TABLE finance_budget_items (
    id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    cycle_id VARCHAR(36) NOT NULL,
    entrepreneurship_id VARCHAR(36) NOT NULL,
    name VARCHAR(200) NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    revision INTEGER NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    PRIMARY KEY (id),
    CHECK (amount >= 0),
    UNIQUE (id, cycle_id, entrepreneurship_id),
    UNIQUE (cycle_id, name),
    FOREIGN KEY(cycle_id) REFERENCES program_cycles (id),
    FOREIGN KEY(entrepreneurship_id) REFERENCES entrepreneurships (id),
    FOREIGN KEY(created_by) REFERENCES users (id)
);
CREATE INDEX ix_finance_budget_items_cycle_id ON finance_budget_items (cycle_id);

CREATE TABLE finance_purchases (
    id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    cycle_id VARCHAR(36) NOT NULL,
    entrepreneurship_id VARCHAR(36) NOT NULL,
    item_id VARCHAR(36) NOT NULL,
    kind VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    supplier VARCHAR(200) NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    submission_date DATE,
    executed_on DATE,
    fundatec_number VARCHAR(100) NOT NULL,
    checklist JSON NOT NULL,
    checklist_version INTEGER NOT NULL,
    revision INTEGER NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    request_key VARCHAR(100) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(item_id, cycle_id, entrepreneurship_id) REFERENCES finance_budget_items (id, cycle_id, entrepreneurship_id),
    UNIQUE (cycle_id, request_key),
    CHECK (amount > 0),
    CHECK (revision > 0),
    CHECK (kind IN ('factura','reintegro','uso_tc','comision_bancaria','pago_contrato')),
    CHECK (status IN ('draft','submitted','correction_requested','validated','fundatec','executed','rejected','cancelled')),
    CHECK (status != 'executed' OR executed_on IS NOT NULL),
    FOREIGN KEY(cycle_id) REFERENCES program_cycles (id),
    FOREIGN KEY(entrepreneurship_id) REFERENCES entrepreneurships (id),
    FOREIGN KEY(created_by) REFERENCES users (id)
);
CREATE INDEX ix_finance_purchases_cycle_id ON finance_purchases (cycle_id);

CREATE TABLE finance_attachments (
    id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    purchase_id VARCHAR(36) NOT NULL,
    document_id VARCHAR(36) NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (purchase_id, document_id),
    FOREIGN KEY(purchase_id) REFERENCES finance_purchases (id),
    FOREIGN KEY(document_id) REFERENCES documents (id),
    FOREIGN KEY(created_by) REFERENCES users (id)
);
CREATE INDEX ix_finance_attachments_purchase_id ON finance_attachments (purchase_id);

CREATE TABLE finance_budget_changes (
    id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    cycle_id VARCHAR(36) NOT NULL,
    entrepreneurship_id VARCHAR(36) NOT NULL,
    source_id VARCHAR(36) NOT NULL,
    target_id VARCHAR(36) NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    revision INTEGER NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(source_id, cycle_id, entrepreneurship_id) REFERENCES finance_budget_items (id, cycle_id, entrepreneurship_id),
    FOREIGN KEY(target_id, cycle_id, entrepreneurship_id) REFERENCES finance_budget_items (id, cycle_id, entrepreneurship_id),
    CHECK (amount > 0 AND source_id != target_id),
    CHECK (status IN ('pending','approved','rejected')),
    FOREIGN KEY(cycle_id) REFERENCES program_cycles (id),
    FOREIGN KEY(entrepreneurship_id) REFERENCES entrepreneurships (id),
    FOREIGN KEY(created_by) REFERENCES users (id)
);
CREATE INDEX ix_finance_budget_changes_cycle_id ON finance_budget_changes (cycle_id);

CREATE TABLE finance_reconciliations (
    id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    cycle_id VARCHAR(36) NOT NULL,
    name VARCHAR(200) NOT NULL,
    sha256 VARCHAR(64) NOT NULL,
    project_reference VARCHAR(300) NOT NULL,
    results JSON NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (cycle_id, sha256),
    FOREIGN KEY(cycle_id) REFERENCES program_cycles (id),
    FOREIGN KEY(created_by) REFERENCES users (id)
);
CREATE INDEX ix_finance_reconciliations_cycle_id ON finance_reconciliations (cycle_id);

CREATE TABLE finance_events (
    id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    cycle_id VARCHAR(36) NOT NULL,
    entity_id VARCHAR(36) NOT NULL,
    action VARCHAR(64) NOT NULL,
    observation TEXT NOT NULL,
    snapshot JSON NOT NULL,
    actor_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(cycle_id) REFERENCES program_cycles (id),
    FOREIGN KEY(actor_id) REFERENCES users (id)
);
CREATE INDEX ix_finance_events_cycle_id ON finance_events (cycle_id);
CREATE INDEX ix_finance_events_entity_id ON finance_events (entity_id);

CREATE FUNCTION finance_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Finance history cannot be deleted'; END IF;
  IF TG_TABLE_NAME IN ('finance_events','finance_reconciliations','finance_attachments') THEN RAISE EXCEPTION 'Immutable finance record'; END IF;
  IF OLD.id != NEW.id OR OLD.created_at != NEW.created_at OR OLD.created_by != NEW.created_by THEN RAISE EXCEPTION 'Immutable ownership'; END IF;
  IF OLD.cycle_id != NEW.cycle_id OR OLD.entrepreneurship_id != NEW.entrepreneurship_id THEN RAISE EXCEPTION 'Immutable scope'; END IF;
  IF TG_TABLE_NAME = 'finance_purchases' THEN
    IF OLD.status IN ('executed','cancelled','rejected') THEN RAISE EXCEPTION 'Final purchase'; END IF;
  END IF;
  IF TG_TABLE_NAME = 'finance_budget_changes' THEN
    IF OLD.status != 'pending' THEN RAISE EXCEPTION 'Final budget change'; END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER finance_history BEFORE UPDATE OR DELETE ON finance_budget_items FOR EACH ROW EXECUTE FUNCTION finance_history_guard();
CREATE TRIGGER finance_history BEFORE UPDATE OR DELETE ON finance_purchases FOR EACH ROW EXECUTE FUNCTION finance_history_guard();
CREATE TRIGGER finance_history BEFORE UPDATE OR DELETE ON finance_attachments FOR EACH ROW EXECUTE FUNCTION finance_history_guard();
CREATE TRIGGER finance_history BEFORE UPDATE OR DELETE ON finance_budget_changes FOR EACH ROW EXECUTE FUNCTION finance_history_guard();
CREATE TRIGGER finance_history BEFORE UPDATE OR DELETE ON finance_reconciliations FOR EACH ROW EXECUTE FUNCTION finance_history_guard();
CREATE TRIGGER finance_history BEFORE UPDATE OR DELETE ON finance_events FOR EACH ROW EXECUTE FUNCTION finance_history_guard();

CREATE FUNCTION finance_scope_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'finance_budget_items' THEN
    IF NOT EXISTS (SELECT 1 FROM program_cycles c JOIN program_enrollments e ON e.id=c.enrollment_id WHERE c.id=NEW.cycle_id AND e.entrepreneurship_id=NEW.entrepreneurship_id AND e.program='Prototipado') THEN RAISE EXCEPTION 'Invalid financial scope'; END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM finance_purchases p JOIN documents d ON d.entrepreneurship_id=p.entrepreneurship_id WHERE p.id=NEW.purchase_id AND d.id=NEW.document_id) THEN RAISE EXCEPTION 'Invalid attachment scope'; END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER finance_scope BEFORE INSERT OR UPDATE ON finance_budget_items FOR EACH ROW EXECUTE FUNCTION finance_scope_guard();
CREATE TRIGGER finance_scope BEFORE INSERT OR UPDATE ON finance_attachments FOR EACH ROW EXECUTE FUNCTION finance_scope_guard();

UPDATE alembic_version SET version_num='013' WHERE alembic_version.version_num = '012';
COMMIT;
