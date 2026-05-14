-- ============================================================
-- APP NTRL — Módulo Nómina
-- Versión: 1.0  |  Fecha: 2026-05-14
-- Tablas: employees, payroll_periods, payroll_transactions,
--         payroll_deductions, payroll_earnings
-- ============================================================

-- ============================================================
-- TABLA: employees
-- ============================================================
CREATE TABLE IF NOT EXISTS employees (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                 VARCHAR(100) NOT NULL,
  email                  VARCHAR(150),
  cargo                  VARCHAR(100) NOT NULL,
  salario_base           DECIMAL(12,2) NOT NULL CHECK (salario_base > 0),
  cuenta_banco           VARCHAR(60),
  banco                  VARCHAR(60),
  tipo_identificacion    VARCHAR(10)  NOT NULL DEFAULT 'CC',
  numero_identificacion  VARCHAR(30)  NOT NULL,
  fecha_ingreso          DATE         NOT NULL,
  estado_laboral         VARCHAR(20)  NOT NULL DEFAULT 'activo'
                           CHECK (estado_laboral IN ('activo','licencia','terminado')),
  user_id                UUID         REFERENCES users(id) ON DELETE SET NULL,
  notas                  TEXT,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(numero_identificacion)
);

CREATE INDEX IF NOT EXISTS idx_employees_estado   ON employees(estado_laboral);
CREATE INDEX IF NOT EXISTS idx_employees_user_id  ON employees(user_id) WHERE user_id IS NOT NULL;

-- ============================================================
-- TABLA: payroll_periods (períodos quincenales)
-- ============================================================
CREATE TABLE IF NOT EXISTS payroll_periods (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       VARCHAR(80) NOT NULL,
  fecha_inicio DATE        NOT NULL,
  fecha_fin    DATE        NOT NULL,
  estado       VARCHAR(20) NOT NULL DEFAULT 'borrador'
                 CHECK (estado IN ('borrador','generado','aprobado','pagado')),
  created_by   UUID        REFERENCES users(id) ON DELETE SET NULL,
  approved_by  UUID        REFERENCES users(id) ON DELETE SET NULL,
  approved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (fecha_fin > fecha_inicio)
);

CREATE INDEX IF NOT EXISTS idx_payroll_periods_estado ON payroll_periods(estado);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_fecha  ON payroll_periods(fecha_inicio DESC);

-- ============================================================
-- TABLA: payroll_transactions (nómina calculada por empleado)
-- ============================================================
CREATE TABLE IF NOT EXISTS payroll_transactions (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id           UUID          NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period_id             UUID          NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  salario_base          DECIMAL(12,2) NOT NULL,
  ingresos_adicionales  DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_deducciones     DECIMAL(12,2) NOT NULL DEFAULT 0,
  neto_pagable          DECIMAL(12,2) GENERATED ALWAYS AS
                          (salario_base + ingresos_adicionales - total_deducciones) STORED,
  observaciones         TEXT,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, period_id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_tx_employee ON payroll_transactions(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_tx_period   ON payroll_transactions(period_id);

-- ============================================================
-- TABLA: payroll_earnings (ingresos adicionales por transacción)
-- ============================================================
CREATE TABLE IF NOT EXISTS payroll_earnings (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  UUID          NOT NULL REFERENCES payroll_transactions(id) ON DELETE CASCADE,
  tipo            VARCHAR(50)   NOT NULL
                    CHECK (tipo IN ('BONIFICACION','COMISION','HORAS_EXTRAS','AUXILIO','OTROS')),
  concepto        VARCHAR(120),
  valor           DECIMAL(12,2) NOT NULL CHECK (valor > 0),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_earnings_transaction ON payroll_earnings(transaction_id);

-- ============================================================
-- TABLA: payroll_deductions (descuentos por transacción)
-- ============================================================
CREATE TABLE IF NOT EXISTS payroll_deductions (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  UUID          NOT NULL REFERENCES payroll_transactions(id) ON DELETE CASCADE,
  tipo            VARCHAR(50)   NOT NULL
                    CHECK (tipo IN ('AFP','EPS','RENTA','PRESTAMO','VOLUNTARIA','OTROS')),
  concepto        VARCHAR(120),
  valor           DECIMAL(12,2) NOT NULL CHECK (valor > 0),
  porcentaje      DECIMAL(5,2),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deductions_transaction ON payroll_deductions(transaction_id);

-- ============================================================
-- TRIGGER: updated_at automático para employees y payroll_periods
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_employees_updated_at') THEN
    CREATE TRIGGER trg_employees_updated_at
      BEFORE UPDATE ON employees
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_payroll_periods_updated_at') THEN
    CREATE TRIGGER trg_payroll_periods_updated_at
      BEFORE UPDATE ON payroll_periods
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_payroll_tx_updated_at') THEN
    CREATE TRIGGER trg_payroll_tx_updated_at
      BEFORE UPDATE ON payroll_transactions
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
