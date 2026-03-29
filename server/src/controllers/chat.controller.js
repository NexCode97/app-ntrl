import { pool } from "../config/database.js";
import { AppError } from "../utils/AppError.js";
import { sendToUser } from "../utils/sseManager.js";
import { saveFile } from "../utils/fileStorage.js";

// Lista de conversaciones del usuario (distintos interlocutores con último mensaje)
export async function listConversations(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (other_user)
         other_user,
         u.name       AS other_name,
         u.role       AS other_role,
         u.area       AS other_area,
         u.avatar     AS other_avatar,
         m.content    AS last_message,
         m.created_at AS last_at,
         COUNT(*) FILTER (WHERE m.to_user_id = $1 AND m.is_read = false) OVER (PARTITION BY other_user) AS unread
       FROM (
         SELECT
           CASE WHEN from_user_id = $1 THEN to_user_id ELSE from_user_id END AS other_user,
           content, created_at, to_user_id, is_read
         FROM messages
         WHERE from_user_id = $1 OR to_user_id = $1
       ) m
       JOIN users u ON u.id = m.other_user
       ORDER BY other_user, m.created_at DESC`,
      [req.user.id]
    );
    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
}

// Mensajes entre el usuario actual y otro usuario
export async function getMessages(req, res, next) {
  try {
    const { userId } = req.params;
    const { rows } = await pool.query(
      `SELECT m.*, u.name AS from_name,
              COALESCE(
                json_agg(
                  json_build_object('emoji', r.emoji, 'count', r.cnt, 'reacted_by_me', r.reacted_by_me)
                ) FILTER (WHERE r.emoji IS NOT NULL),
                '[]'
              ) AS reactions
       FROM messages m
       JOIN users u ON u.id = m.from_user_id
       LEFT JOIN (
         SELECT message_id, emoji,
                COUNT(*) AS cnt,
                bool_or(user_id = $1) AS reacted_by_me
         FROM message_reactions GROUP BY message_id, emoji
       ) r ON r.message_id = m.id
       WHERE (m.from_user_id = $1 AND m.to_user_id = $2)
          OR (m.from_user_id = $2 AND m.to_user_id = $1)
       GROUP BY m.id, u.name
       ORDER BY m.created_at ASC
       LIMIT 100`,
      [req.user.id, userId]
    );

    // Marcar como leídos los mensajes recibidos
    await pool.query(
      `UPDATE messages SET is_read = true
       WHERE from_user_id = $1 AND to_user_id = $2 AND is_read = false`,
      [userId, req.user.id]
    );

    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
}

// Enviar mensaje a un usuario (texto y/o archivo)
export async function sendMessage(req, res, next) {
  try {
    const { userId } = req.params;
    const content  = req.body.content?.trim() ?? "";
    const file     = req.file ?? null;

    if (!content && !file) throw new AppError("El mensaje no puede estar vacío.", 400, "EMPTY_MESSAGE");
    if (content.length > 2000) throw new AppError("Mensaje demasiado largo.", 400, "MESSAGE_TOO_LONG");

    // Verificar que el destinatario existe
    const { rows: [target] } = await pool.query(
      "SELECT id, name, role FROM users WHERE id = $1 AND is_active = true",
      [userId]
    );
    if (!target) throw new AppError("Usuario no encontrado.", 404, "NOT_FOUND");

    let fileUrl  = null;
    let fileName = null;
    if (file) {
      fileUrl  = await saveFile(file, "chat");
      fileName = file.originalname;
    }

    const { rows: [msg] } = await pool.query(
      `INSERT INTO messages (from_user_id, to_user_id, content, file_url, file_name)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, userId, content || null, fileUrl, fileName]
    );

    const { rows: [sender] } = await pool.query("SELECT name FROM users WHERE id = $1", [req.user.id]);
    sendToUser(userId, {
      type:     "new_message",
      message:  msg,
      fromName: sender?.name ?? "Usuario",
    });

    res.status(201).json({ status: "ok", data: msg });
  } catch (err) { next(err); }
}

// Conteo de mensajes no leídos totales
export async function unreadCount(req, res, next) {
  try {
    const { rows: [{ count }] } = await pool.query(
      "SELECT COUNT(*) FROM messages WHERE to_user_id = $1 AND is_read = false",
      [req.user.id]
    );
    res.json({ status: "ok", count: parseInt(count) });
  } catch (err) { next(err); }
}

// Agregar / quitar reacción en un mensaje (toggle)
export async function reactToMessage(req, res, next) {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    if (!emoji) throw new AppError("Emoji requerido.", 400, "MISSING_EMOJI");

    // Verificar que el mensaje existe y obtener los participantes
    const { rows: [msg] } = await pool.query(
      "SELECT from_user_id, to_user_id FROM messages WHERE id = $1",
      [messageId]
    );
    if (!msg) throw new AppError("Mensaje no encontrado.", 404, "NOT_FOUND");

    // Toggle: si ya existe la reacción la elimina, si no la crea
    const { rows: [existing] } = await pool.query(
      "SELECT id FROM message_reactions WHERE message_id=$1 AND user_id=$2 AND emoji=$3",
      [messageId, req.user.id, emoji]
    );

    if (existing) {
      await pool.query("DELETE FROM message_reactions WHERE id=$1", [existing.id]);
    } else {
      await pool.query(
        "INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1,$2,$3)",
        [messageId, req.user.id, emoji]
      );
    }

    // Obtener el estado actualizado de reacciones del mensaje
    const { rows: reactions } = await pool.query(
      `SELECT emoji, COUNT(*) AS count,
              bool_or(user_id = $2) AS reacted_by_me
       FROM message_reactions WHERE message_id = $1
       GROUP BY emoji ORDER BY count DESC`,
      [messageId, req.user.id]
    );

    // Notificar al otro participante via SSE
    const otherId = msg.from_user_id === req.user.id ? msg.to_user_id : msg.from_user_id;
    sendToUser(otherId, { type: "message_reaction", messageId, reactions });

    res.json({ status: "ok", data: reactions });
  } catch (err) { next(err); }
}

// Lista de workers disponibles para iniciar conversación (solo admin)
export async function listWorkers(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, area, avatar,
              (SELECT COUNT(*) FROM messages WHERE from_user_id = u.id AND to_user_id = $1 AND is_read = false) AS unread,
              (SELECT content FROM messages WHERE (from_user_id=u.id AND to_user_id=$1) OR (from_user_id=$1 AND to_user_id=u.id) ORDER BY created_at DESC LIMIT 1) AS last_message
       FROM users u
       WHERE role = 'worker' AND is_active = true
       ORDER BY name`,
      [req.user.id]
    );
    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
}

// Lista de todos los contactos disponibles (para trabajadores: todos los usuarios activos excepto sí mismo)
export async function listContacts(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, role, area, position, avatar,
              (SELECT COUNT(*) FROM messages WHERE from_user_id = u.id AND to_user_id = $1 AND is_read = false) AS unread,
              (SELECT content FROM messages WHERE (from_user_id=u.id AND to_user_id=$1) OR (from_user_id=$1 AND to_user_id=u.id) ORDER BY created_at DESC LIMIT 1) AS last_message
       FROM users u
       WHERE is_active = true AND id != $1
       ORDER BY role DESC, name ASC`,
      [req.user.id]
    );
    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
}
