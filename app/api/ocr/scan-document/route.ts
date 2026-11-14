export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { DocumentOcrError, scanDocumentImages } from "@/lib/document-ocr";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const imagesList: string[] =
      Array.isArray(body.images) && body.images.length > 0
        ? body.images
        : body.image
        ? [body.image]
        : [];

    const result = await scanDocumentImages(imagesList);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof DocumentOcrError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("OCR Route Error:", error);
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء معالجة الوثيقة" },
      { status: 500 }
    );
  }
}
