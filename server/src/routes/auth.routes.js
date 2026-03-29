import { Router } from "express";
import * as authCtrl from "../controllers/auth.controller.js";
import * as googleCtrl from "../controllers/google.auth.controller.js";
import { validate } from "../middleware/validate.js";
import { requireAuth, requireAuthSSE } from "../middleware/auth.js";
import { strictLimiter } from "../middleware/rateLimiter.js";
import { loginSchema } from "../validations/auth.validation.js";
import { uploadImage, sanitizeUpload } from "../middleware/upload.js";

const router = Router();

// Google OAuth
router.get("/google",          strictLimiter, googleCtrl.googleLogin);
router.get("/google/callback", googleCtrl.googleCallback);

router.post("/login",        strictLimiter, validate(loginSchema), authCtrl.login);
router.post("/refresh",      authCtrl.refresh);
router.post("/logout",       requireAuth, authCtrl.logout);
router.get("/me",            requireAuth, authCtrl.me);
router.patch("/me",          requireAuth, authCtrl.updateMe);
router.post("/me/avatar",    requireAuth, uploadImage.single("avatar"), sanitizeUpload, authCtrl.uploadAvatar);
router.delete("/me/avatar",  requireAuth, authCtrl.deleteAvatar);

export default router;
