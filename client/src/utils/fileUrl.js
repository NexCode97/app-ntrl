/**
 * Retorna la URL correcta para un archivo subido.
 * - Si ya es una URL completa (Cloudinary en producción): la devuelve tal cual.
 * - Si es un path local (desarrollo): le agrega el prefijo /uploads/.
 */
export function fileUrl(filePath) {
  if (!filePath) return null;
  if (filePath.startsWith("http")) return filePath;
  return `/uploads/${filePath}`;
}
