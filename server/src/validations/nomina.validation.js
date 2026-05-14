import Joi from "joi";

export const employeeSchema = Joi.object({
  nombre:                Joi.string().min(2).max(100).required(),
  email:                 Joi.string().email().optional().allow(null, ""),
  cargo:                 Joi.string().min(2).max(100).required(),
  salario_base:          Joi.number().positive().required(),
  cuenta_banco:          Joi.string().max(60).optional().allow(null, ""),
  banco:                 Joi.string().max(60).optional().allow(null, ""),
  tipo_identificacion:   Joi.string().valid("CC","CE","PA","NIT").default("CC"),
  numero_identificacion: Joi.string().min(4).max(30).required(),
  fecha_ingreso:         Joi.date().iso().required(),
  estado_laboral:        Joi.string().valid("activo","licencia","terminado").default("activo"),
  user_id:               Joi.string().uuid().optional().allow(null),
  notas:                 Joi.string().max(500).optional().allow(null, ""),
});

export const employeePatchSchema = Joi.object({
  nombre:                Joi.string().min(2).max(100),
  email:                 Joi.string().email().allow(null, ""),
  cargo:                 Joi.string().min(2).max(100),
  salario_base:          Joi.number().positive(),
  cuenta_banco:          Joi.string().max(60).allow(null, ""),
  banco:                 Joi.string().max(60).allow(null, ""),
  tipo_identificacion:   Joi.string().valid("CC","CE","PA","NIT"),
  numero_identificacion: Joi.string().min(4).max(30),
  fecha_ingreso:         Joi.date().iso(),
  estado_laboral:        Joi.string().valid("activo","licencia","terminado"),
  user_id:               Joi.string().uuid().allow(null),
  notas:                 Joi.string().max(500).allow(null, ""),
}).min(1);

export const periodSchema = Joi.object({
  nombre:      Joi.string().min(3).max(80).required(),
  fecha_inicio: Joi.date().iso().required(),
  fecha_fin:    Joi.date().iso().greater(Joi.ref("fecha_inicio")).required(),
});

export const earningSchema = Joi.object({
  tipo:     Joi.string().valid("BONIFICACION","COMISION","HORAS_EXTRAS","AUXILIO","OTROS").required(),
  concepto: Joi.string().max(120).optional().allow(null, ""),
  valor:    Joi.number().positive().required(),
});

export const deductionSchema = Joi.object({
  tipo:       Joi.string().valid("AFP","EPS","RENTA","PRESTAMO","VOLUNTARIA","OTROS").required(),
  concepto:   Joi.string().max(120).optional().allow(null, ""),
  valor:      Joi.number().positive().required(),
  porcentaje: Joi.number().min(0).max(100).optional().allow(null),
});

export const transactionPatchSchema = Joi.object({
  observaciones: Joi.string().max(500).allow(null, ""),
}).min(1);
