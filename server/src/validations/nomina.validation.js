import Joi from "joi";

// ── Constantes Colombia 2026 ──────────────────────────────────
export const SMMLV_2026     = 1_750_905;
export const AUX_TRANSPORTE = 249_095;

// ── Helpers de cálculo ────────────────────────────────────────
export function calcularTransaccion(emp, campos = {}) {
  const dias     = Number(campos.dias_laborados ?? 15);
  const salario  = Number(emp.salario_base);
  const esLaboral = emp.tipo_contrato === "laboral";

  const basico              = Math.round(salario * dias / 30);
  const aux_transporte      = esLaboral ? Math.round(AUX_TRANSPORTE * dias / 30) : 0;
  const anticipo_prestaciones = esLaboral ? 0 : Number(campos.anticipo_prestaciones ?? emp.anticipo_prest_fijo ?? 0);
  const horas_extras        = Number(campos.horas_extras ?? 0);
  const otros_ingresos      = Number(campos.otros_ingresos ?? 0);
  const total_devengado     = basico + aux_transporte + anticipo_prestaciones + horas_extras + otros_ingresos;

  const salud               = esLaboral ? Math.round(basico * 0.04) : 0;
  const pension             = esLaboral ? Math.round(basico * 0.04) : 0;
  const anticipo_adelanto   = Number(campos.anticipo_adelanto ?? 0);
  const funeral             = Number(campos.funeral ?? 0);
  const otros_descuentos    = Number(campos.otros_descuentos ?? 0);
  const total_deducido      = salud + pension + anticipo_adelanto + funeral + otros_descuentos;

  const neto_pagable = total_devengado - total_deducido;

  return {
    tipo_contrato_snap:    emp.tipo_contrato,
    salario_base_snap:     salario,
    dias_laborados:        dias,
    basico,
    aux_transporte,
    anticipo_prestaciones,
    horas_extras,
    otros_ingresos,
    total_devengado,
    salud,
    pension,
    anticipo_adelanto,
    funeral,
    otros_descuentos,
    total_deducido,
    neto_pagable,
    observaciones:         campos.observaciones ?? null,
  };
}

// ── Schemas Joi ───────────────────────────────────────────────
export const employeeSchema = Joi.object({
  nombre:                Joi.string().trim().min(2).max(100).required(),
  email:                 Joi.string().email().optional().allow(null, ""),
  cargo:                 Joi.string().trim().min(2).max(100).required(),
  salario_base:          Joi.number().positive().required(),
  tipo_contrato:         Joi.string().valid("laboral","prestacion_servicios").required(),
  banco:                 Joi.string().max(60).optional().allow(null, ""),
  tipo_cuenta:           Joi.string().valid("nequi","llave","bancolombia","davivienda","bbva","otro").optional().allow(null),
  numero_cuenta:         Joi.string().max(50).optional().allow(null, ""),
  anticipo_prest_fijo:   Joi.number().min(0).default(0),
  tipo_identificacion:   Joi.string().valid("CC","CE","PA","NIT").default("CC"),
  numero_identificacion: Joi.string().min(4).max(30).required(),
  fecha_ingreso:         Joi.date().iso().required(),
  estado_laboral:        Joi.string().valid("activo","licencia","terminado").default("activo"),
  notas:                 Joi.string().max(500).optional().allow(null, ""),
});

export const employeePatchSchema = Joi.object({
  nombre:                Joi.string().trim().min(2).max(100),
  email:                 Joi.string().email().allow(null, ""),
  cargo:                 Joi.string().trim().min(2).max(100),
  salario_base:          Joi.number().positive(),
  tipo_contrato:         Joi.string().valid("laboral","prestacion_servicios"),
  banco:                 Joi.string().max(60).allow(null, ""),
  tipo_cuenta:           Joi.string().valid("nequi","llave","bancolombia","davivienda","bbva","otro").allow(null),
  numero_cuenta:         Joi.string().max(50).allow(null, ""),
  anticipo_prest_fijo:   Joi.number().min(0),
  tipo_identificacion:   Joi.string().valid("CC","CE","PA","NIT"),
  numero_identificacion: Joi.string().min(4).max(30),
  fecha_ingreso:         Joi.date().iso(),
  estado_laboral:        Joi.string().valid("activo","licencia","terminado"),
  notas:                 Joi.string().max(500).allow(null, ""),
}).min(1);

export const periodSchema = Joi.object({
  nombre:      Joi.string().trim().min(3).max(80).required(),
  quincena:    Joi.number().valid(1, 2).required(),
  mes:         Joi.number().integer().min(1).max(12).required(),
  anio:        Joi.number().integer().min(2020).max(2100).required(),
  fecha_inicio: Joi.date().iso().required(),
  fecha_fin:    Joi.date().iso().greater(Joi.ref("fecha_inicio")).required(),
});

export const transactionUpdateSchema = Joi.object({
  dias_laborados:        Joi.number().min(0.5).max(30),
  anticipo_prestaciones: Joi.number().min(0),
  horas_extras:          Joi.number().min(0),
  otros_ingresos:        Joi.number().min(0),
  anticipo_adelanto:     Joi.number().min(0),
  funeral:               Joi.number().min(0),
  otros_descuentos:      Joi.number().min(0),
  observaciones:         Joi.string().max(500).allow("", null),
}).min(1);
