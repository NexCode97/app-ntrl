import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { permissiveLimiter, moderateLimiter } from "../../middleware/rateLimiter.js";
import { upload, sanitizeUploadLight } from "../../middleware/upload.js";
import * as ctrl from "../../controllers/catalog.controller.js";

const router = Router();
router.use(requireAuth);

router.get("/",       permissiveLimiter, ctrl.listProducts);
router.post("/",      moderateLimiter, upload.single("image"), sanitizeUploadLight, ctrl.createProduct);
router.put("/:id",    moderateLimiter, upload.single("image"), sanitizeUploadLight, ctrl.updateProduct);
router.delete("/:id", moderateLimiter, ctrl.deleteProduct);

export default router;
