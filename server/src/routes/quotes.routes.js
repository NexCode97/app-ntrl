import { Router }                         from "express";
import { requireAuth, requireRole }       from "../middleware/auth.js";
import { moderateLimiter }               from "../middleware/rateLimiter.js";
import * as ctrl                         from "../controllers/quotes.controller.js";

const router = Router();
router.use(requireAuth, moderateLimiter, requireRole("admin", "vendedor"));

router.get("/",              ctrl.list);
router.get("/:id",           ctrl.getById);
router.get("/:id/pdf",       ctrl.downloadPDF);
router.get("/:id/catalog-pdf", ctrl.downloadCatalogPDF);
router.post("/",             ctrl.create);
router.post("/:id/send",     ctrl.sendByEmail);
router.put("/:id",           ctrl.update);
router.delete("/:id",        ctrl.remove);

export default router;
