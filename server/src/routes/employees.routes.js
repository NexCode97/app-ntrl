import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { moderateLimiter } from "../middleware/rateLimiter.js";
import * as ctrl from "../controllers/employees.controller.js";
import { employeeSchema, employeePatchSchema } from "../validations/nomina.validation.js";

const router = Router();
router.use(requireAuth, requireRole("admin", "vendedor"), moderateLimiter);

router.get("/",      ctrl.listEmployees);
router.get("/:id",   ctrl.getEmployee);
router.post("/",     validate(employeeSchema),      ctrl.createEmployee);
router.patch("/:id", validate(employeePatchSchema), ctrl.updateEmployee);
router.delete("/:id", ctrl.deleteEmployee);

export default router;
