/**
 * Retorna la URL correcta para un archivo subido.
 * - Cloudinary: inyecta q_auto,f_auto para optimización automática de calidad y formato.
 * - Path local: apunta al backend Express.
 */
const API_BASE = import.meta.env.VITE_API_URL || "";

export function fileUrl(filePath, { optimize = true } = {}) {
  if (!filePath) return null;

  // URL de Cloudinary — inyectar transformaciones de optimización
  if (filePath.includes("res.cloudinary.com") && optimize) {
    // Insertar "q_auto,f_auto" justo después de "/upload/"
    // Ej: .../upload/v123/avatars/foto.jpg → .../upload/q_auto,f_auto/v123/avatars/foto.jpg
    return filePath.replace("/upload/", "/upload/q_auto,f_auto/");
  }

  if (filePath.startsWith("http")) return filePath;
  return `${API_BASE}/uploads/${filePath}`;
}
