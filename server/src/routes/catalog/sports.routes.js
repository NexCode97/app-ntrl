import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { permissiveLimiter, moderateLimiter } from "../../middleware/rateLimiter.js";
import * as ctrl from "../../controllers/catalog.controller.js";

const router = Router();
router.use(requireAuth);

router.get("/",     permissiveLimiter, ctrl.listSports);
router.post("/",    moderateLimiter,   ctrl.createSport);
router.put("/:id",  moderateLimiter,   ctrl.updateSport);
router.delete("/:id", moderateLimiter, ctrl.deleteSport);

export default router;
