import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { permissiveLimiter, moderateLimiter } from "../../middleware/rateLimiter.js";
import * as ctrl from "../../controllers/catalog.controller.js";

const router = Router();
router.use(requireAuth);

router.get("/",     permissiveLimiter, ctrl.listLines);
router.post("/",    moderateLimiter,   ctrl.createLine);
router.put("/:id",  moderateLimiter,   ctrl.updateLine);
router.delete("/:id", moderateLimiter, ctrl.deleteLine);

export default router;
