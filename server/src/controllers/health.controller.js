import { pool } from "../config/database.js";
import { redis } from "../config/redis.js";
import { statfsSync } from "fs";

export async function health(req, res) {
  const result = { status: "ok", timestamp: new Date().toISOString(), checks: {} };

  // PostgreSQL
  try {
    const { rows } = await pool.query("SELECT 1");
    result.checks.postgres = "ok";
  } catch (err) {
    result.checks.postgres = "error";
    result.status = "degraded";
  }

  // Redis
  try {
    await redis.ping();
    result.checks.redis = "ok";
  } catch (err) {
    result.checks.redis = "error";
    result.status = "degraded";
  }

  // Disco
  try {
    const stats = statfsSync("/");
    const freeGB = (stats.bfree * stats.bsize) / (1024 ** 3);
    result.checks.disk = freeGB > 1 ? "ok" : "low";
    if (freeGB <= 1) result.status = "degraded";
  } catch {
    result.checks.disk = "unknown";
  }

  const statusCode = result.status === "ok" ? 200 : 503;
  res.status(statusCode).json(result);
}
