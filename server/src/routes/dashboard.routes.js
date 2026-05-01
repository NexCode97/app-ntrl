import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { permissiveLimiter, moderateLimiter } from "../middleware/rateLimiter.js";
import * as ctrl from "../controllers/dashboard.controller.js";

const router = Router();
router.use(requireAuth);

router.get("/",                    requireRole("admin"), permissiveLimiter, ctrl.getSummary);
router.get("/history",             requireRole("admin"), permissiveLimiter, ctrl.getMonthlyHistory);
router.get("/upcoming-deliveries", requireRole("admin","vendedor"), permissiveLimiter, ctrl.getUpcomingDeliveries);
router.get("/pending-balances",    requireRole("admin","vendedor"), permissiveLimiter, ctrl.getPendingBalances);
router.delete("/cache",            requireRole("admin"), moderateLimiter,   ctrl.invalidateCache);

export default router;
