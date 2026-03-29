import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { pagination } from "../middleware/pagination.js";
import { validate } from "../middleware/validate.js";
import { moderateLimiter, permissiveLimiter } from "../middleware/rateLimiter.js";
import { upload, sanitizeUpload } from "../middleware/upload.js";
import * as ctrl from "../controllers/orders.controller.js";
import { createOrderSchema, updateOrderSchema } from "../validations/order.validation.js";

// Los campos enviados como FormData llegan como strings — parsear items y design_files_keep antes de validar
function parseFormDataFields(req, res, next) {
  if (req.body.items && typeof req.body.items === "string") {
    try { req.body.items = JSON.parse(req.body.items); }
    catch { return res.status(400).json({ status: "error", message: "El campo items es inválido." }); }
  }
  if (req.body.design_files_keep && typeof req.body.design_files_keep === "string") {
    try { req.body.design_files_keep = JSON.parse(req.body.design_files_keep); }
    catch { req.body.design_files_keep = []; }
  }
  next();
}

const router = Router();
router.use(requireAuth, moderateLimiter);

router.get("/",          permissiveLimiter, pagination, ctrl.list);
router.get("/calendar",  permissiveLimiter, ctrl.calendar);
router.get("/:id",       ctrl.getById);
router.get("/:id/history", requireRole("admin"), ctrl.getHistory);

router.post("/",
  requireRole("admin"),
  upload.array("design", 5),
  sanitizeUpload,
  parseFormDataFields,
  validate(createOrderSchema),
  ctrl.create
);

router.put("/:id",
  requireRole("admin"),
  upload.array("design", 5),
  sanitizeUpload,
  parseFormDataFields,
  validate(updateOrderSchema),
  ctrl.update
);

router.delete("/:id",        requireRole("admin"), ctrl.remove);
router.delete("/:id/design", requireRole("admin"), ctrl.removeDesignFile);

export default router;
