import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { moderateLimiter } from "../middleware/rateLimiter.js";
import * as ctrl from "../controllers/payroll.controller.js";
import {
  periodSchema,
  transactionUpdateSchema,
} from "../validations/nomina.validation.js";

const router = Router();
router.use(requireAuth, requireRole("admin", "vendedor"), moderateLimiter);

// ── Períodos ─────────────────────────────────────────────────
router.get   ("/",          ctrl.listPeriods);
router.get   ("/:id",       ctrl.getPeriod);
router.post  ("/",          validate(periodSchema), ctrl.createPeriod);
router.delete("/:id",       ctrl.deletePeriod);

// ── Transacciones (edición por fila de empleado) ─────────────
router.get   ("/:id/transactions",                ctrl.listTransactions);
router.patch ("/:id/transactions/:txId",
              validate(transactionUpdateSchema),  ctrl.updateTransaction);

// ── Flujo de aprobación ──────────────────────────────────────
router.post("/:id/approve",    ctrl.approvePeriod);
router.post("/:id/mark-paid",  ctrl.markAsPaid);

// ── Exportaciones ────────────────────────────────────────────
router.get("/:id/export/banco",               ctrl.exportBanco);
router.get("/:id/export/comprobante/:txId",   ctrl.getComprobante);

export default router;
