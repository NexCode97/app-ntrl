-- ============================================================
-- APP NTRL — Esquema inicial de base de datos
-- Natural Ropa Deportiva — Sistema de Gestión de Pedidos
-- Versión: 1.0  |  Fecha: 2026-03-28
-- ============================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- SECUENCIAS
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1 INCREMENT 1;

-- ============================================================
-- TABLA: users
-- ============================================================

CREATE TABLE users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  age           INTEGER      CHECK (age > 0 AND age < 120),
  area          VARCHAR(50), -- NULL para administradores
  role          VARCHAR(20)  NOT NULL CHECK (role IN ('admin', 'worker')),
  password_hash VARCHAR(255) NOT NULL,
  is_active     BOOLEAN      NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email    ON users(email);
CREATE INDEX idx_users_role     ON users(role);
CREATE INDEX idx_users_area     ON users(area) WHERE area IS NOT NULL;

-- ============================================================
-- TABLA: sessions (máximo 3 por usuario — Trigger T7)
-- ============================================================

CREATE TABLE sessions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash VARCHAR(255) UNIQUE NOT NULL,
  ip_address         INET,
  user_agent         TEXT,
  expires_at         TIMESTAMPTZ NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id    ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- ============================================================
-- TABLA: sports (Catálogo — Deportes)
-- ============================================================

CREATE TABLE sports (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  slug          VARCHAR(100) UNIQUE NOT NULL,
  is_active     BOOLEAN      NOT NULL DEFAULT true,
  display_order INTEGER      NOT NULL DEFAULT 0
);

-- ============================================================
-- TABLA: lines (Catálogo — Líneas por deporte)
-- ============================================================

CREATE TABLE lines (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id      UUID        NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  slug          VARCHAR(100) NOT NULL,
  is_active     BOOLEAN      NOT NULL DEFAULT true,
  display_order INTEGER      NOT NULL DEFAULT 0,
  UNIQUE(sport_id, slug)
);

CREATE INDEX idx_lines_sport_id ON lines(sport_id);

-- ============================================================
-- TABLA: products (Catálogo — Productos por línea)
-- ============================================================

CREATE TABLE products (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id       UUID        NOT NULL REFERENCES lines(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  slug          VARCHAR(100) NOT NULL,
  is_active     BOOLEAN      NOT NULL DEFAULT true,
  display_order INTEGER      NOT NULL DEFAULT 0,
  UNIQUE(line_id, slug)
);

CREATE INDEX idx_products_line_id ON products(line_id);

-- ============================================================
-- TABLA: customers (Clientes)
-- ============================================================

CREATE TABLE customers (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(200) NOT NULL,
  document_type   VARCHAR(10)  NOT NULL CHECK (document_type IN ('nit', 'cedula')),
  document_number VARCHAR(50)  UNIQUE NOT NULL,
  is_company      BOOLEAN      NOT NULL DEFAULT false,
  address         TEXT,
  phone           VARCHAR(30),
  email           VARCHAR(150),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_document ON customers(document_number);
CREATE INDEX idx_customers_name     ON customers(name);

-- ============================================================
-- TABLA: orders (Pedidos)
-- ============================================================

CREATE TABLE orders (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number INTEGER      UNIQUE NOT NULL DEFAULT nextval('order_number_seq'),
  customer_id  UUID         NOT NULL REFERENCES customers(id),
  created_by   UUID         NOT NULL REFERENCES users(id),
  delivery_date DATE,
  description  TEXT,
  status       VARCHAR(20)  NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'in_progress', 'completed', 'delivered')),
  design_file  VARCHAR(500),
  total        NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid  NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance      NUMERIC(12,2) GENERATED ALWAYS AS (total - amount_paid) STORED,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_customer_id   ON orders(customer_id);
CREATE INDEX idx_orders_status        ON orders(status);
CREATE INDEX idx_orders_created_at    ON orders(created_at DESC);
CREATE INDEX idx_orders_order_number  ON orders(order_number DESC);

-- ============================================================
-- TABLA: order_items (Productos dentro de un pedido)
-- ============================================================

CREATE TABLE order_items (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID         NOT NULL REFERENCES products(id),
  gender     VARCHAR(20)  NOT NULL CHECK (gender IN ('nino', 'hombre', 'mujer', 'unisex')),
  -- sizes: {"T2": 3, "TM": 5, "TXL": 2}  (talla -> cantidad)
  sizes      JSONB        NOT NULL DEFAULT '{}',
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal   NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- ============================================================
-- TABLA: order_payments (Abonos — máximo 3 por pedido)
-- ============================================================

CREATE TABLE order_payments (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_number INTEGER      NOT NULL CHECK (payment_number BETWEEN 1 AND 3),
  amount         NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  method         VARCHAR(30)  NOT NULL
                 CHECK (method IN ('efectivo', 'transferencia', 'link_bold')),
  bank           VARCHAR(50), -- Bancolombia, Nequi, Davivienda, Bold
  paid_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_by     UUID         NOT NULL REFERENCES users(id),
  UNIQUE(order_id, payment_number)  -- idempotencia: no duplicar abono
);

CREATE INDEX idx_order_payments_order_id ON order_payments(order_id);

-- ============================================================
-- TABLA: order_history (Historial de cambios)
-- ============================================================

CREATE TABLE order_history (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id),
  action     VARCHAR(100) NOT NULL,
  -- changes: {"field": {"old": "valor anterior", "new": "valor nuevo"}}
  changes    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_history_order_id  ON order_history(order_id);
CREATE INDEX idx_order_history_created_at ON order_history(created_at DESC);

-- ============================================================
-- TABLA: production_tasks (Tareas de producción por pedido)
-- ============================================================

CREATE TABLE production_tasks (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  area         VARCHAR(50) NOT NULL
               CHECK (area IN (
                 'corte',
                 'diseno_disenar',
                 'diseno_imprimir',
                 'sublimacion',
                 'ensamble',
                 'terminados'
               )),
  status       VARCHAR(20) NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'in_progress', 'done')),
  started_by   UUID REFERENCES users(id),
  completed_by UUID REFERENCES users(id),
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(order_id, area)
);

CREATE INDEX idx_production_tasks_order_id ON production_tasks(order_id);
CREATE INDEX idx_production_tasks_area     ON production_tasks(area);
CREATE INDEX idx_production_tasks_status   ON production_tasks(status);

-- ============================================================
-- TABLA: notifications
-- ============================================================

CREATE TABLE notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES users(id) ON DELETE CASCADE, -- NULL = todos los admins
  type       VARCHAR(50) NOT NULL,
  message    TEXT        NOT NULL,
  data       JSONB       NOT NULL DEFAULT '{}',
  is_read    BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id    ON notifications(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_notifications_is_read    ON notifications(is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================
-- TABLA: sync_operations (Cola de sincronización offline)
-- ============================================================

CREATE TABLE sync_operations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id   UUID,
  operation   VARCHAR(20) NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  payload     JSONB       NOT NULL,
  version     BIGINT      NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_at  TIMESTAMPTZ
);

CREATE INDEX idx_sync_ops_client_id  ON sync_operations(client_id);
CREATE INDEX idx_sync_ops_applied_at ON sync_operations(applied_at) WHERE applied_at IS NULL;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- T1: Calcular subtotal de order_item al insertar/actualizar
CREATE OR REPLACE FUNCTION fn_calc_item_subtotal()
RETURNS TRIGGER AS $$
DECLARE
  v_total_qty INTEGER;
BEGIN
  SELECT COALESCE(SUM(value::INTEGER), 0)
  INTO v_total_qty
  FROM jsonb_each_text(NEW.sizes);

  NEW.subtotal := v_total_qty * NEW.unit_price;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_item_subtotal
BEFORE INSERT OR UPDATE OF sizes, unit_price ON order_items
FOR EACH ROW EXECUTE FUNCTION fn_calc_item_subtotal();

-- T2: Recalcular total del pedido cuando cambian sus items (con SELECT FOR UPDATE)
CREATE OR REPLACE FUNCTION fn_recalc_order_total()
RETURNS TRIGGER AS $$
DECLARE
  v_order_id UUID;
BEGIN
  v_order_id := COALESCE(NEW.order_id, OLD.order_id);

  -- Bloquea la fila del pedido para evitar actualizaciones concurrentes
  PERFORM id FROM orders WHERE id = v_order_id FOR UPDATE;

  UPDATE orders
  SET
    total      = (SELECT COALESCE(SUM(subtotal), 0) FROM order_items WHERE order_id = v_order_id),
    updated_at = NOW()
  WHERE id = v_order_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_total
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH ROW EXECUTE FUNCTION fn_recalc_order_total();

-- T3: Recalcular amount_paid cuando cambian los abonos
CREATE OR REPLACE FUNCTION fn_recalc_order_payments()
RETURNS TRIGGER AS $$
DECLARE
  v_order_id UUID;
BEGIN
  v_order_id := COALESCE(NEW.order_id, OLD.order_id);

  PERFORM id FROM orders WHERE id = v_order_id FOR UPDATE;

  UPDATE orders
  SET
    amount_paid = (SELECT COALESCE(SUM(amount), 0) FROM order_payments WHERE order_id = v_order_id),
    updated_at  = NOW()
  WHERE id = v_order_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_payments
AFTER INSERT OR UPDATE OR DELETE ON order_payments
FOR EACH ROW EXECUTE FUNCTION fn_recalc_order_payments();

-- T4: Actualizar estado del pedido según tareas de producción
CREATE OR REPLACE FUNCTION fn_update_order_status()
RETURNS TRIGGER AS $$
DECLARE
  v_total     INTEGER;
  v_done      INTEGER;
  v_started   INTEGER;
  v_cur_status VARCHAR;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'done'),
    COUNT(*) FILTER (WHERE status IN ('in_progress', 'done')),
    o.status
  INTO v_total, v_done, v_started, v_cur_status
  FROM production_tasks pt
  JOIN orders o ON o.id = pt.order_id
  WHERE pt.order_id = NEW.order_id
  GROUP BY o.status;

  -- No modificar pedidos ya entregados
  IF v_cur_status = 'delivered' THEN
    RETURN NEW;
  END IF;

  IF v_done = v_total THEN
    UPDATE orders SET status = 'completed', updated_at = NOW() WHERE id = NEW.order_id;
  ELSIF v_started > 0 THEN
    UPDATE orders SET status = 'in_progress', updated_at = NOW() WHERE id = NEW.order_id;
  ELSE
    UPDATE orders SET status = 'pending', updated_at = NOW() WHERE id = NEW.order_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_status
AFTER UPDATE OF status ON production_tasks
FOR EACH ROW EXECUTE FUNCTION fn_update_order_status();

-- T5: Crear tareas de producción automáticamente al crear un pedido
CREATE OR REPLACE FUNCTION fn_create_production_tasks()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO production_tasks (order_id, area) VALUES
    (NEW.id, 'corte'),
    (NEW.id, 'diseno_disenar'),
    (NEW.id, 'diseno_imprimir'),
    (NEW.id, 'sublimacion'),
    (NEW.id, 'ensamble'),
    (NEW.id, 'terminados');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_create_production_tasks
AFTER INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION fn_create_production_tasks();

-- T6: Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- T7: Limitar sesiones activas a máximo 3 por usuario (eliminar la más antigua)
CREATE OR REPLACE FUNCTION fn_limit_user_sessions()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM sessions
  WHERE id = (
    SELECT id FROM sessions
    WHERE user_id = NEW.user_id
    ORDER BY created_at ASC
    LIMIT 1
  )
  AND (SELECT COUNT(*) FROM sessions WHERE user_id = NEW.user_id) >= 3;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_limit_sessions
BEFORE INSERT ON sessions
FOR EACH ROW EXECUTE FUNCTION fn_limit_user_sessions();

-- T8: Limpiar sesiones expiradas (llamado por cron, no trigger)
-- Se ejecuta vía: SELECT fn_cleanup_expired_sessions();
CREATE OR REPLACE FUNCTION fn_cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;
