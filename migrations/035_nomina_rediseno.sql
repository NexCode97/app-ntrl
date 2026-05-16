-- ============================================================
-- APP NTRL — Nómina: Rediseño completo para nómina colombiana
-- Migración: 035  |  Fecha: 2026-05-16
-- Contexto: Natural Ropa Deportiva
--   • 2 empleados con contrato LABORAL (aportan salud + pensión)
--   • 7 empleados con PRESTACIÓN DE SERVICIOS (anticipo prestaciones)
--   • Todos pagan por transferencia (NEQUI / LLAVE)
--   • Quincenas: 1ra (1–15) y 2da (16–último día del mes)
-- ============================================================

-- ── 1. AMPLIAR tabla employees ────────────────────────────────
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS tipo_contrato      VARCHAR(25) NOT NULL DEFAULT 'prestacion_servicios'
    CHECK (tipo_contrato IN ('laboral','prestacion_servicios')),
  ADD COLUMN IF NOT EXISTS tipo_cuenta        VARCHAR(20) DEFAULT 'nequi'
    CHECK (tipo_cuenta IN ('nequi','llave','bancolombia','davivienda','bbva','otro')),
  ADD COLUMN IF NOT EXISTS anticipo_prest_fijo DECIMAL(12,2) NOT NULL DEFAULT 0
    CHECK (anticipo_prest_fijo >= 0);

-- Renombrar cuenta_banco → numero_cuenta si no existe ya
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='employees' AND column_name='cuenta_banco'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='employees' AND column_name='numero_cuenta'
  ) THEN
    ALTER TABLE employees RENAME COLUMN cuenta_banco TO numero_cuenta;
  END IF;
END $$;

-- ── 2. AMPLIAR tabla payroll_periods ─────────────────────────
ALTER TABLE payroll_periods
  ADD COLUMN IF NOT EXISTS quincena     SMALLINT CHECK (quincena IN (1, 2)),
  ADD COLUMN IF NOT EXISTS mes          SMALLINT CHECK (mes BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS anio         SMALLINT CHECK (anio >= 2020),
  ADD COLUMN IF NOT EXISTS total_nomina DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_by      UUID REFERENCES users(id) ON DELETE SET NULL;

-- Actualizar CHECK constraint de estado (remover 'generado' del modelo anterior)
DO $$
BEGIN
  -- Eliminar el constraint viejo si existe
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'payroll_periods'
      AND constraint_type = 'CHECK'
      AND constraint_name LIKE '%estado%'
  ) THEN
    ALTER TABLE payroll_periods DROP CONSTRAINT IF EXISTS payroll_periods_estado_check;
  END IF;
  -- Agregar el nuevo constraint sin 'generado'
  ALTER TABLE payroll_periods
    ADD CONSTRAINT payroll_periods_estado_check
    CHECK (estado IN ('borrador','aprobado','pagado'));
EXCEPTION WHEN OTHERS THEN
  -- Si ya fue aplicado o el constraint no existe con ese nombre, continuar
  NULL;
END $$;

-- ── 3. ELIMINAR tablas genéricas del modelo anterior ─────────
DROP TABLE IF EXISTS payroll_earnings   CASCADE;
DROP TABLE IF EXISTS payroll_deductions CASCADE;
DROP TABLE IF EXISTS payroll_transactions CASCADE;

-- ── 4. RECREAR payroll_transactions con columnas fijas ────────
-- Cada fila = un empleado en un período quincenal
-- Snapshot del empleado al momento del período (inmutable una vez aprobado)
CREATE TABLE payroll_transactions (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id           UUID          NOT NULL REFERENCES employees(id)       ON DELETE CASCADE,
  period_id             UUID          NOT NULL REFERENCES payroll_periods(id)  ON DELETE CASCADE,

  -- ── Snapshot del empleado ──────────────────────────────────
  tipo_contrato_snap    VARCHAR(25)   NOT NULL,  -- 'laboral' | 'prestacion_servicios'
  salario_base_snap     DECIMAL(12,2) NOT NULL,  -- copia del salario al momento de generar

  -- ── Tiempo laborado ────────────────────────────────────────
  dias_laborados        DECIMAL(4,1)  NOT NULL DEFAULT 15
                          CHECK (dias_laborados > 0 AND dias_laborados <= 30),

  -- ── DEVENGADOS ─────────────────────────────────────────────
  basico                DECIMAL(12,2) NOT NULL DEFAULT 0,
    -- = round(salario_base_snap * dias_laborados / 30)
  aux_transporte        DECIMAL(12,2) NOT NULL DEFAULT 0,
    -- solo laboral: round(249095 * dias_laborados / 30)
  anticipo_prestaciones DECIMAL(12,2) NOT NULL DEFAULT 0,
    -- solo prestacion_servicios: editable (desde anticipo_prest_fijo del empleado)
  horas_extras          DECIMAL(12,2) NOT NULL DEFAULT 0,
    -- cualquier contrato: valor en pesos
  otros_ingresos        DECIMAL(12,2) NOT NULL DEFAULT 0,
    -- bonificaciones eventuales
  total_devengado       DECIMAL(12,2) NOT NULL DEFAULT 0,
    -- = basico + aux_transporte + anticipo_prestaciones + horas_extras + otros_ingresos

  -- ── DEDUCIDOS ──────────────────────────────────────────────
  salud                 DECIMAL(12,2) NOT NULL DEFAULT 0,
    -- solo laboral: round(basico * 0.04)
  pension               DECIMAL(12,2) NOT NULL DEFAULT 0,
    -- solo laboral: round(basico * 0.04)
  anticipo_adelanto     DECIMAL(12,2) NOT NULL DEFAULT 0,
    -- plata entregada anticipadamente a descontar
  funeral               DECIMAL(12,2) NOT NULL DEFAULT 0,
    -- aporte fondo de empleados (ej: $5.000 fijo)
  otros_descuentos      DECIMAL(12,2) NOT NULL DEFAULT 0,
    -- préstamos, embargos, etc.
  total_deducido        DECIMAL(12,2) NOT NULL DEFAULT 0,
    -- = salud + pension + anticipo_adelanto + funeral + otros_descuentos

  -- ── RESULTADO ──────────────────────────────────────────────
  neto_pagable          DECIMAL(12,2) NOT NULL DEFAULT 0,
    -- = total_devengado - total_deducido

  observaciones         TEXT,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, period_id)
);

CREATE INDEX idx_payroll_tx_employee ON payroll_transactions(employee_id);
CREATE INDEX idx_payroll_tx_period   ON payroll_transactions(period_id);
CREATE INDEX idx_payroll_tx_period_emp ON payroll_transactions(period_id, employee_id);

-- ── 5. TRIGGER updated_at para payroll_transactions ──────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_payroll_tx_updated_at'
  ) THEN
    CREATE TRIGGER trg_payroll_tx_updated_at
      BEFORE UPDATE ON payroll_transactions
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- ── 6. CONSTANTES 2026 (Colombia) ────────────────────────────
-- SMMLV 2026  = $1.750.905
-- Aux. Transporte 2026 = $249.095
-- Salud empleado = 4% del básico devengado
-- Pensión empleado = 4% del básico devengado
-- Estas se aplican en el backend al calcular
