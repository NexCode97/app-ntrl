import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { moderateLimiter } from "../middleware/rateLimiter.js";
import { upload, sanitizeUploadLight } from "../middleware/upload.js";
import * as ctrl from "../controllers/financial.controller.js";
import { paymentSchema, itemPriceSchema } from "../validations/financial.validation.js";

const router = Router();
router.use(requireAuth, moderateLimiter);

// Vendedor puede ver, agregar y eliminar abonos — solo admin puede editar precios de items
router.get("/:orderId",                        requireRole("admin","vendedor"), ctrl.getFinancialSummary);
router.patch("/:orderId/item-price",           requireRole("admin"), validate(itemPriceSchema), ctrl.updateItemPrice);
router.post("/:orderId/payments",              requireRole("admin","vendedor"), upload.single("receipt"), sanitizeUploadLight, validate(paymentSchema), ctrl.addPayment);
router.delete("/:orderId/payments/:paymentId", requireRole("admin","vendedor"), ctrl.deletePayment);

export default router;
