export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
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

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let image = "";
    let folder = "general";

    // Handle Multipart Form-Data or JSON payloads
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      folder = (formData.get("folder") as string) || "general";

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = path.extname(file.name).replace(".", "").toLowerCase() || "jpg";
      
      const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "") || "general";
      const randomId = crypto.randomBytes(6).toString("hex");
      const filename = `${Date.now()}-${randomId}.${ext}`;

      const uploadDir = path.join(process.cwd(), "public", "uploads", safeFolder);
      await fs.mkdir(uploadDir, { recursive: true });

      const targetPath = path.join(uploadDir, filename);
      await fs.writeFile(targetPath, buffer);

      const fileUrl = `/uploads/${safeFolder}/${filename}`;
      return NextResponse.json({
        url: fileUrl,
        secure_url: fileUrl,
        filename,
        size: buffer.length,
      });
    }

    const body = await req.json();
    image = body.image || body.data || "";
    folder = body.folder || "general";

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // If it's already an existing HTTP/local URL, return it directly
    if (
      typeof image === "string" &&
      (image.startsWith("http://") ||
        image.startsWith("https://") ||
        image.startsWith("/uploads/"))
    ) {
      return NextResponse.json({ url: image, secure_url: image });
    }

    let buffer: Buffer;
    let ext = "jpg";

    if (typeof image === "string") {
      const dataUriMatch = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-+.]+);base64,(.+)$/);
      if (dataUriMatch) {
        const mime = dataUriMatch[1].toLowerCase();
        ext = MIME_MAP[mime] || "jpg";
        buffer = Buffer.from(dataUriMatch[2], "base64");
      } else {
        // Raw base64 string
        buffer = Buffer.from(image, "base64");
      }
    } else {
      return NextResponse.json({ error: "Invalid image data format" }, { status: 400 });
    }

    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "") || "general";
    const randomId = crypto.randomBytes(6).toString("hex");
    const filename = `${Date.now()}-${randomId}.${ext}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", safeFolder);
    await fs.mkdir(uploadDir, { recursive: true });

    const targetPath = path.join(uploadDir, filename);
    await fs.writeFile(targetPath, buffer);

    const fileUrl = `/uploads/${safeFolder}/${filename}`;

    return NextResponse.json({
      url: fileUrl,
      secure_url: fileUrl,
      filename,
      size: buffer.length,
    });
  } catch (error: any) {
    console.error("Local disk upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save file to server storage" },
      { status: 500 }
    );
  }
}
