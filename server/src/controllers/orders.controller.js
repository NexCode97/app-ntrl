import * as orderService from "../services/order.service.js";
import { saveFile, deleteFile } from "../utils/fileStorage.js";
import { unlinkSync, existsSync } from "fs";
import path from "path";
import { config } from "../config/index.js";
import { redis, redisPub } from "../config/redis.js";

function invalidateDashboard() {
  return redis.del("dashboard:summary").catch(() => {});
}

export async function list(req, res, next) {
  try {
    const filters = { status: req.query.status || null };
    const result = await orderService.listOrders(req.pagination, filters);
    res.json({ status: "ok", ...result, limit: req.pagination.limit, offset: req.pagination.offset });
  } catch (err) { next(err); }
}

export async function calendar(req, res, next) {
  try {
    const { month } = req.query; // formato: YYYY-MM
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ status: "error", message: "Parámetro month requerido (YYYY-MM)." });
    }
    const { pool } = await import("../config/database.js");
    const { rows } = await pool.query(
      `SELECT o.id, o.order_number, o.status, o.delivery_date,
              c.name AS customer_name
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       WHERE o.delivery_date >= DATE_TRUNC('month', $1::date)
         AND o.delivery_date <  DATE_TRUNC('month', $1::date) + INTERVAL '1 month'
       ORDER BY o.delivery_date ASC`,
      [`${month}-01`]
    );
    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
}

export async function getById(req, res, next) {
  try {
    const order = await orderService.getOrderDetail(req.params.id);
    res.json({ status: "ok", data: order });
  } catch (err) { next(err); }
}

async function uploadFiles(files, subfolder) {
  return Promise.all(files.map(async (f) => ({ url: await saveFile(f, subfolder), name: f.originalname })));
}

export async function create(req, res, next) {
  try {
    const files = req.files?.length ? req.files : req.file ? [req.file] : [];
    const designFiles = await uploadFiles(files, "designs");
    const order = await orderService.createOrder(req.user.id, req.body, designFiles);
    await invalidateDashboard();
    res.status(201).json({ status: "ok", data: order });
  } catch (err) { next(err); }
}

export async function update(req, res, next) {
  try {
    const files = req.files?.length ? req.files : req.file ? [req.file] : [];
    const designFiles = await uploadFiles(files, "designs");

    await orderService.updateOrder(req.params.id, req.user.id, req.body, designFiles);
    const order = await orderService.getOrderDetail(req.params.id);
    await invalidateDashboard();
    res.json({ status: "ok", data: order });
  } catch (err) { next(err); }
}

export async function removeDesignFile(req, res, next) {
  try {
    const { file } = req.body;
    if (!file) return res.status(400).json({ status: "error", message: "Indica el archivo a eliminar." });
    await orderService.removeDesignFile(req.params.id, req.user.id, file);
    const order = await orderService.getOrderDetail(req.params.id);
    res.json({ status: "ok", data: order });
  } catch (err) { next(err); }
}

export async function remove(req, res, next) {
  try {
    const order = await orderService.getOrderDetail(req.params.id);

    // Eliminar archivos de diseño (local y Cloudinary)
    const files = order.design_file ? (() => {
      try { const p = JSON.parse(order.design_file); return Array.isArray(p) ? p : [p]; }
      catch { return [order.design_file]; }
    })() : [];
    await Promise.all(files.map(async (f) => {
      const fileStr = typeof f === "object" ? (f.url ?? "") : String(f ?? "");
      if (!fileStr) return;
      if (fileStr.startsWith("http")) {
        await deleteFile(fileStr).catch(() => {}); // borrar de Cloudinary
      } else {
        const filePath = path.join(config.upload.dir, fileStr);
        if (existsSync(filePath)) unlinkSync(filePath);
      }
    }));

    await orderService.deleteOrder(req.params.id);
    await invalidateDashboard();
    await redisPub.publish("ntrl:notifications", JSON.stringify({ targetRole: "worker", type: "order_deleted" })).catch(() => {});
    res.json({ status: "ok", message: "Pedido eliminado." });
  } catch (err) { next(err); }
}

export async function getHistory(req, res, next) {
  try {
    const { rows } = await (await import("../config/database.js")).pool.query(
      `SELECT oh.*, u.name as user_name
       FROM order_history oh
       JOIN users u ON u.id = oh.user_id
       WHERE oh.order_id = $1
       ORDER BY oh.created_at DESC`,
      [req.params.id]
    );
    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
}
