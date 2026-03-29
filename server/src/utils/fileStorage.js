/**
 * Abstracción de almacenamiento de archivos.
 * - Desarrollo (sin CLOUDINARY_URL): guarda en filesystem local.
 * - Producción   (con CLOUDINARY_URL): guarda en Cloudinary (gratis hasta 25 GB).
 */

import { writeFileSync, mkdirSync, existsSync, unlinkSync } from "fs";
import path from "path";
import { config } from "../config/index.js";

const useCloudinary = !!process.env.CLOUDINARY_URL;

let cloudinary;
if (useCloudinary) {
  const { v2 } = await import("cloudinary");
  cloudinary = v2;
  // CLOUDINARY_URL se parsea automáticamente por el SDK al importar
}

/**
 * Guarda un archivo (multer memoryStorage) y retorna la URL/path resultante.
 * @param {Express.Multer.File} file
 * @param {string} subfolder  Ej: "avatars" | "designs" | "chat"
 * @returns {Promise<string>} URL de Cloudinary o path local ("subfolder/filename.ext")
 */
export async function saveFile(file, subfolder = "uploads") {
  if (useCloudinary) {
    return new Promise((resolve, reject) => {
      const ext = file.originalname.split(".").pop().toLowerCase();
      const resourceType = ["pdf"].includes(ext) ? "raw" : "image";

      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: subfolder, resource_type: resourceType },
        (error, result) => {
          if (error) reject(error);
          else resolve(result.secure_url);
        }
      );
      uploadStream.end(file.buffer);
    });
  }

  // Filesystem local (desarrollo)
  const dir = path.join(config.upload.dir, subfolder);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const ext  = file.originalname.split(".").pop().toLowerCase();
  const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const dest = path.join(dir, name);

  writeFileSync(dest, file.buffer);
  return `${subfolder}/${name}`;
}

/**
 * Elimina un archivo por su URL/path.
 * @param {string} filePath  URL de Cloudinary o path local
 */
export async function deleteFile(filePath) {
  if (!filePath) return;

  if (useCloudinary && filePath.startsWith("http")) {
    try {
      const url     = new URL(filePath);
      const parts   = url.pathname.split("/upload/");
      if (parts[1]) {
        const publicId = parts[1].replace(/^v\d+\//, "").replace(/\.[^.]+$/, "");
        const ext      = filePath.split(".").pop().toLowerCase();
        const resourceType = ext === "pdf" ? "raw" : "image";
        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      }
    } catch { /* ignorar errores de borrado */ }
    return;
  }

  // Filesystem local
  const fullPath = path.join(config.upload.dir, filePath);
  if (existsSync(fullPath)) unlinkSync(fullPath);
}
