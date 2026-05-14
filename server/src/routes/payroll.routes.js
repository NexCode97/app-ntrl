import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { moderateLimiter } from "../middleware/rateLimiter.js";
import * as ctrl from "../controllers/payroll.controller.js";
import { periodSchema, earningSchema, deductionSchema } from "../validations/nomina.validation.js";

const router = Router();
router.use(requireAuth, requireRole("admin", "vendedor"), moderateLimiter);

// Períodos
router.get("/",                           ctrl.listPeriods);
router.get("/:id",                        ctrl.getPeriod);
router.post("/",       validate(periodSchema), ctrl.createPeriod);
router.delete("/:id",                     ctrl.deletePeriod);

// Generar nómina
router.post("/:id/generate",              ctrl.generatePayroll);

// Transacciones del período
router.get("/:id/transactions",           ctrl.listTransactions);

// Ingresos adicionales
router.post("/:id/transactions/:txId/earnings",              validate(earningSchema), ctrl.addEarning);
router.delete("/:id/transactions/:txId/earnings/:earningId", ctrl.deleteEarning);

// Deducciones
router.post("/:id/transactions/:txId/deductions",                  validate(deductionSchema), ctrl.addDeduction);
router.delete("/:id/transactions/:txId/deductions/:deductionId",   ctrl.deleteDeduction);

// Flujo de aprobación
router.post("/:id/approve",               ctrl.approvePeriod);
router.post("/:id/mark-paid",             ctrl.markAsPaid);

// Exportar TXT bancario
router.get("/:id/export/txt",             ctrl.exportTxt);

export default router;
