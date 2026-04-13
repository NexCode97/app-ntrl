import { Router } from "express";
import { seedDemo, cleanupDemo } from "../controllers/demo.controller.js";

const router = Router();

router.post("/seed",    seedDemo);
router.post("/cleanup", cleanupDemo);

export default router;
