import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { moderateLimiter } from "../middleware/rateLimiter.js";
import * as ctrl from "../controllers/production.controller.js";

const router = Router();
router.use(requireAuth, moderateLimiter);

router.get("/my-tasks",             ctrl.getMyTasks);
router.get("/overview",             ctrl.getProductionOverview);
router.get("/order/:orderId",        ctrl.getTasksByOrder);
router.patch("/tasks/:taskId/status", ctrl.updateTaskStatus);

export default router;
