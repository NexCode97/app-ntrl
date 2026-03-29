import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { moderateLimiter } from "../middleware/rateLimiter.js";
import { pool } from "../config/database.js";

const router = Router();
router.use(requireAuth, moderateLimiter);

// Hora del servidor — para resolver conflictos LWW (Last Write Wins)
router.get("/time", (req, res) => {
  res.json({ status: "ok", serverTime: new Date().toISOString() });
});

// Guardar operaciones offline pendientes
router.post("/operations", async (req, res, next) => {
  try {
    const { clientId, operations } = req.body;
    if (!Array.isArray(operations) || !operations.length) {
      return res.status(400).json({ status: "error", message: "operations[] requerido." });
    }

    const results = [];
    for (const op of operations) {
      const { rows: [saved] } = await pool.query(
        `INSERT INTO sync_operations (client_id, entity_type, entity_id, operation, payload, version)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [clientId, op.entityType, op.entityId || null, op.operation, JSON.stringify(op.payload), op.version || Date.now()]
      );
      results.push(saved.id);
    }

    res.json({ status: "ok", saved: results.length });
  } catch (err) { next(err); }
});

export default router;
