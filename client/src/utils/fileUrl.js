/**
 * Retorna la URL correcta para un archivo subido.
 * - Si ya es una URL completa (Cloudinary en producción): la devuelve tal cual.
 * - Si es un path local: apunta al backend (Render en prod, relativo en dev).
 */
const API_BASE = import.meta.env.VITE_API_URL || "";

export function fileUrl(filePath) {
  if (!filePath) return null;
  if (filePath.startsWith("http")) return filePath;
  return `${API_BASE}/uploads/${filePath}`;
}
