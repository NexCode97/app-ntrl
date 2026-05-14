# Módulo Nómina — Especificación técnica
**Fecha**: 2026-05-13  
**Estado**: Propuesta aprobada  
**Responsable**: NexCode97

---

## 📋 Decisiones Confirmadas

| Aspecto | Decisión |
|--------|----------|
| **Periodicidad** | Quincenal |
| **Deducciones automáticas** | No (Admin configura manualmente) |
| **Acceso** | Admin + Vendedores |
| **Integración bancaria** | Opción C + B (comprobante + TXT para importar) |
| **CRM Empleados** | Tabla `employees` separada |

---

## 🗄️ Schema — Tablas a crear

### `employees`
```sql
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150),
  cargo VARCHAR(100) NOT NULL,
  salario_base DECIMAL(10,2) NOT NULL,
  cuenta_banco VARCHAR(50),
  tipo_identificacion VARCHAR(20), -- "CC", "CE", "PA", etc.
  numero_identificacion VARCHAR(30) UNIQUE NOT NULL,
  fecha_ingreso DATE NOT NULL,
  estado_laboral VARCHAR(20) NOT NULL DEFAULT 'activo', -- activo|licencia|terminado
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- opcional
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_employees_numero_id ON employees(numero_identificacion);
CREATE INDEX idx_employees_estado ON employees(estado_laboral);
```

### `payroll_periods`
```sql
CREATE TABLE payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_num INT NOT NULL, -- 1-24 en el año
  año INT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'borrador', 
    -- borrador|generado|aprobado|pagado
  created_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(periodo_num, año)
);
CREATE INDEX idx_payroll_periods_estado ON payroll_periods(estado);
```

### `payroll_transactions` (nómina calculada)
```sql
CREATE TABLE payroll_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  
  salario_base DECIMAL(10,2) NOT NULL,
  ingresos_adicionales DECIMAL(10,2) DEFAULT 0,
  total_ingresos DECIMAL(10,2) GENERATED ALWAYS AS 
    (salario_base + ingresos_adicionales) STORED,
  
  total_deducciones DECIMAL(10,2) DEFAULT 0,
  neto_pagable DECIMAL(10,2) GENERATED ALWAYS AS 
    (total_ingresos - total_deducciones) STORED,
  
  fecha_pago DATE,
  estado VARCHAR(20) DEFAULT 'generado', -- generado|aprobado|pagado
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(employee_id, period_id)
);
CREATE INDEX idx_payroll_transactions_employee ON payroll_transactions(employee_id);
CREATE INDEX idx_payroll_transactions_period ON payroll_transactions(period_id);
```

### `payroll_deductions` (descuentos)
```sql
CREATE TABLE payroll_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES payroll_transactions(id) ON DELETE CASCADE,
  
  tipo VARCHAR(50) NOT NULL, -- AFP|EPS|RENTA|VOLUNTARIA|OTROS
  concepto VARCHAR(100),
  valor DECIMAL(10,2) NOT NULL,
  porcentaje DECIMAL(5,2), -- si es % del salario
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_deductions_transaction ON payroll_deductions(transaction_id);
```

### `payroll_earnings` (ingresos adicionales)
```sql
CREATE TABLE payroll_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES payroll_transactions(id) ON DELETE CASCADE,
  
  tipo VARCHAR(50) NOT NULL, -- BONIFICACION|COMISION|HORAS_EXTRAS|OTROS
  concepto VARCHAR(100),
  valor DECIMAL(10,2) NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_earnings_transaction ON payroll_earnings(transaction_id);
```

---

## 🔄 Flujo de Nómina

```
1. Admin crea período (01/05 - 15/05/2026)
   ↓
2. Sistema lista empleados activos
   ↓
3. Admin/Vendedor añade ingresos (bonos, comisiones, extras)
   ↓
4. Sistema calcula automáticamente:
   - Total ingresos (salario base + adicionales)
   - Descuentos (configurables por Admin)
   - Neto pagable
   ↓
5. Admin revisa y aprueba
   ↓
6. Sistema genera:
   - Comprobante PDF (para cada empleado)
   - TXT para importar en banco
   ↓
7. Marcado como pagado (manual desde UI)
```

---

## 🎯 Funcionalidades MVP

### Backend (Express)
- `POST /api/employees` — crear empleado
- `GET /api/employees` — listar empleados activos
- `PUT /api/employees/:id` — editar empleado
- `POST /api/payroll-periods` — crear período
- `GET /api/payroll-periods` — listar períodos
- `POST /api/payroll/generate` — calcular nómina para período
- `GET /api/payroll/:period_id` — ver transacciones del período
- `POST /api/payroll/:transaction_id/approve` — aprobar nómina
- `GET /api/payroll/:transaction_id/pdf` — descargar comprobante
- `GET /api/payroll/:period_id/txt` — descargar TXT bancario

### Frontend (React)
- **Página Empleados** (`/payroll/employees`)
  - Tabla CRUD
  - Filtros: estado laboral, cargo
  - Formulario de registro

- **Página Períodos** (`/payroll/periods`)
  - Crear período quincenal
  - Listado con estado (borrador|generado|aprobado|pagado)
  - Acceso rápido a generar nómina

- **Página Generar Nómina** (`/payroll/generate/:period_id`)
  - Tabla con empleados + campos para ingresos adicionales
  - Cálculo en tiempo real
  - Vista previa de descuentos
  - Botón aprobar

- **Reportes** (`/payroll/reports`)
  - Descargar PDF individual
  - Descargar TXT bancario (todas las transferencias)
  - Historial de períodos

---

## 📌 Notas importantes

- **Validaciones**: Salario mínimo legal (2024 COL: $1.300.000)
- **Seguridad**: Solo Admin + Vendedores acceden
- **Auditoría**: Registrar quién aprobó, cuándo, cambios
- **Sin deducciones automáticas en v1**: Se añaden manualmente (escalable después)

---

## 🚀 Próximos pasos

1. ✅ Crear migration con 5 tablas
2. ✅ Backend: Controllers + Routes
3. ✅ Frontend: Páginas + Componentes
4. ✅ Generador de PDF + TXT
5. ✅ Tests + Deploy

