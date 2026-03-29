import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { pagination } from "../middleware/pagination.js";
import { validate } from "../middleware/validate.js";
import { moderateLimiter } from "../middleware/rateLimiter.js";
import * as usersCtrl from "../controllers/users.controller.js";
import { createUserSchema, updateUserSchema } from "../validations/user.validation.js";

const router = Router();

router.use(requireAuth, requireRole("admin"), moderateLimiter);

router.get("/",     pagination, usersCtrl.list);
router.post("/",    validate(createUserSchema), usersCtrl.create);
router.put("/:id",  validate(updateUserSchema), usersCtrl.update);
router.delete("/:id", usersCtrl.remove);

export default router;
