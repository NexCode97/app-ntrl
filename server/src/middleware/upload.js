import multer from "multer";
import path from "path";
import { readFileSync } from "fs";
import sharp from "sharp";
import { config } from "../config/index.js";
import { AppError } from "../utils/AppError.js";

// Magic bytes para validar tipo real de archivo
const MAGIC_BYTES = {
  "ffd8ff":       "image/jpeg",
  "89504e47":     "image/png",
  "25504446":     "application/pdf",
};

function detectMimeType(buffer) {
  const hex = buffer.slice(0, 4).toString("hex");
  for (const [magic, mime] of Object.entries(MAGIC_BYTES)) {
    if (hex.startsWith(magic)) return mime;
  }
  return null;
}

const storage = multer.memoryStorage();

const ALLOWED_EXTENSIONS       = [".jpg", ".jpeg", ".png", ".pdf"];
const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png"];

function makeUpload(allowedExts, errMsg) {
  return multer({
    storage,
    limits: { fileSize: config.upload.maxSizeMB * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const ext    = path.extname(file.originalname).toLowerCase();
      const mimeOk = config.upload.allowedMimeTypes.includes(file.mimetype);
      const extOk  = allowedExts.includes(ext);
      if (mimeOk || extOk) cb(null, true);
      else cb(new AppError(errMsg, 400, "INVALID_FILE_TYPE"));
    },
  });
}

export const upload      = makeUpload(ALLOWED_EXTENSIONS,       "Solo JPG, PNG o PDF.");
export const uploadImage = makeUpload(ALLOWED_IMAGE_EXTENSIONS, "Solo JPG o PNG.");

// Middleware: valida magic bytes + sanitiza imágenes con Sharp (soporta array de archivos)
export async function sanitizeUpload(req, res, next) {
  const files = req.files?.length ? req.files : req.file ? [req.file] : [];
  if (!files.length) return next();

  try {
    for (const file of files) {
      const realMime = detectMimeType(file.buffer);
      if (!realMime) {
        return next(new AppError("Tipo de archivo no reconocido.", 400, "FILE_MISMATCH"));
      }
      // Corregir el mimetype con el real detectado (por si el browser envió octet-stream)
      file.mimetype = realMime;
      if (realMime === "image/jpeg" || realMime === "image/png") {
        const ext = realMime === "image/jpeg" ? "jpeg" : "png";
        file.buffer = await sharp(file.buffer)
          .rotate()
          .toFormat(ext, { quality: 85 })
          .toBuffer();
        file.mimetype = realMime;
      }
    }
    next();
  } catch (err) {
    next(new AppError("No se pudo procesar la imagen.", 400, "IMAGE_PROCESSING_ERROR"));
  }
}
