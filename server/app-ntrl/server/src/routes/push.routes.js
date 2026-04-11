import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as ctrl from "../controllers/push.controller.js";

const router = Router();

router.get("/vapid-key",   ctrl.getVapidKey);
router.post("/subscribe",  requireAuth, ctrl.subscribe);
router.post("/unsubscribe", requireAuth, ctrl.unsubscribe);

export default router;
