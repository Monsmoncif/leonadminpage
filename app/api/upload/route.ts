export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { saveBufferToUploads, saveImageToUploads } from "@/lib/server-upload";

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

      const result = await saveBufferToUploads(buffer, ext, folder);
      return NextResponse.json(result);
    }

    const body = await req.json();
    image = body.image || body.data || "";
    folder = body.folder || "general";

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    if (typeof image !== "string") {
      return NextResponse.json({ error: "Invalid image data format" }, { status: 400 });
    }

    const result = await saveImageToUploads(image, folder);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Local disk upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save file to server storage" },
      { status: 500 }
    );
  }
}
