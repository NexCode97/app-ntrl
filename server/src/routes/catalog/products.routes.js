import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { permissiveLimiter, moderateLimiter } from "../../middleware/rateLimiter.js";
import * as ctrl from "../../controllers/catalog.controller.js";

const router = Router();
router.use(requireAuth);

router.get("/",     permissiveLimiter, ctrl.listProducts);
router.post("/",    moderateLimiter,   ctrl.createProduct);
router.put("/:id",  moderateLimiter,   ctrl.updateProduct);
router.delete("/:id", moderateLimiter, ctrl.deleteProduct);

export default router;
