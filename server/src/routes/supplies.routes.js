import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { moderateLimiter } from "../middleware/rateLimiter.js";
import * as ctrl from "../controllers/supplies.controller.js";
import * as suppliersCtrl from "../controllers/suppliers.controller.js";

const router = Router();
router.use(requireAuth, moderateLimiter);

// Proveedores — deben ir ANTES de /:id para evitar conflicto
router.get("/suppliers",        requireRole("admin"), suppliersCtrl.list);
router.post("/suppliers",       requireRole("admin"), suppliersCtrl.create);
router.put("/suppliers/:id",    requireRole("admin"), suppliersCtrl.update);
router.delete("/suppliers/:id", requireRole("admin"), suppliersCtrl.remove);

// Solicitudes de insumos
router.get("/",       ctrl.list);
router.post("/",      ctrl.create);
router.put("/:id",    requireRole("admin"), ctrl.updateStatus);
router.delete("/:id", ctrl.remove);

export default router;
