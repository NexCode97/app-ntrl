import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { permissiveLimiter, moderateLimiter } from "../middleware/rateLimiter.js";
import * as ctrl from "../controllers/dashboard.controller.js";

const router = Router();
router.use(requireAuth, requireRole("admin"));

router.get("/",                    permissiveLimiter, ctrl.getSummary);
router.get("/upcoming-deliveries", permissiveLimiter, ctrl.getUpcomingDeliveries);
router.delete("/cache",            moderateLimiter,   ctrl.invalidateCache);

export default router;
