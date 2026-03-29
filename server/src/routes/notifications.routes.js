import { Router } from "express";
import { requireAuth, requireAuthSSE } from "../middleware/auth.js";
import { pagination } from "../middleware/pagination.js";
import { permissiveLimiter } from "../middleware/rateLimiter.js";
import * as ctrl from "../controllers/notifications.controller.js";

const router = Router();

router.get("/stream",       requireAuthSSE, ctrl.stream);  // SSE — token via query param
router.use(requireAuth);
router.get("/unread-count", permissiveLimiter, ctrl.unreadCount);
router.get("/",             permissiveLimiter, pagination, ctrl.list);
router.patch("/read-all",   ctrl.markAllRead);
router.patch("/:id/read",   ctrl.markRead);

export default router;
