import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { moderateLimiter } from "../middleware/rateLimiter.js";
import * as ctrl from "../controllers/financial.controller.js";
import { paymentSchema, itemPriceSchema } from "../validations/financial.validation.js";

const router = Router();
router.use(requireAuth, requireRole("admin"), moderateLimiter);

router.get("/:orderId",                   ctrl.getFinancialSummary);
router.patch("/:orderId/item-price",      validate(itemPriceSchema), ctrl.updateItemPrice);
router.post("/:orderId/payments",         validate(paymentSchema),   ctrl.addPayment);
router.delete("/:orderId/payments/:paymentId", ctrl.deletePayment);

export default router;
