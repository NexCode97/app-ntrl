import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { moderateLimiter } from "../middleware/rateLimiter.js";
import { upload, sanitizeUpload } from "../middleware/upload.js";
import * as ctrl from "../controllers/chat.controller.js";

const router = Router();
router.use(requireAuth, moderateLimiter);

router.get("/workers",           ctrl.listWorkers);
router.get("/contacts",          ctrl.listContacts);
router.get("/unread-count",      ctrl.unreadCount);
router.get("/conversations",     ctrl.listConversations);
router.get("/:userId",                    ctrl.getMessages);
router.post("/:userId",                   upload.single("file"), sanitizeUpload, ctrl.sendMessage);
router.post("/messages/:messageId/react", ctrl.reactToMessage);

export default router;
