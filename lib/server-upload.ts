import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const MIME_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
  "application/octet-stream": "bin",
};

export interface SavedUploadResult {
  url: string;
  secure_url: string;
  filename?: string;
  size?: number;
}

export function sanitizeUploadFolder(folder?: string): string {
  return (folder || "general").replace(/[^a-zA-Z0-9_-]/g, "") || "general";
}

export async function saveBufferToUploads(
  buffer: Buffer,
  ext = "jpg",
  folder = "general"
): Promise<SavedUploadResult> {
  const safeFolder = sanitizeUploadFolder(folder);
  const safeExt = (ext || "jpg").replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "jpg";
  const randomId = crypto.randomBytes(6).toString("hex");
  const filename = `${Date.now()}-${randomId}.${safeExt}`;

  const uploadDir = path.join(process.cwd(), "public", "uploads", safeFolder);
  await fs.mkdir(uploadDir, { recursive: true });

  const targetPath = path.join(uploadDir, filename);
  await fs.writeFile(targetPath, buffer);

  const fileUrl = `/uploads/${safeFolder}/${filename}`;
  return {
    url: fileUrl,
    secure_url: fileUrl,
    filename,
    size: buffer.length,
  };
}

/**
 * Persists a data URI, raw base64 string, or returns existing http(s)/uploads URL unchanged.
 */
export async function saveImageToUploads(
  image: string,
  folder = "general"
): Promise<SavedUploadResult> {
  if (!image || typeof image !== "string") {
    throw new Error("Invalid image data format");
  }

  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("/uploads/")
  ) {
    return { url: image, secure_url: image };
  }

  let buffer: Buffer;
  let ext = "jpg";

  const dataUriMatch = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-+.]+);base64,(.+)$/);
  if (dataUriMatch) {
    const mime = dataUriMatch[1].toLowerCase();
    ext = MIME_MAP[mime] || "jpg";
    buffer = Buffer.from(dataUriMatch[2], "base64");
  } else {
    buffer = Buffer.from(image, "base64");
  }

  return saveBufferToUploads(buffer, ext, folder);
}

