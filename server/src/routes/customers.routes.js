import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { pagination } from "../middleware/pagination.js";
import { validate } from "../middleware/validate.js";
import { moderateLimiter } from "../middleware/rateLimiter.js";
import * as ctrl from "../controllers/customers.controller.js";
import { customerSchema } from "../validations/customer.validation.js";

const router = Router();
router.use(requireAuth, moderateLimiter);

router.get("/",     pagination, ctrl.list);
router.get("/:id",  ctrl.getById);
router.post("/",    validate(customerSchema), ctrl.create);
router.put("/:id",  validate(customerSchema), ctrl.update);
router.delete("/:id", ctrl.remove);

export default router;
