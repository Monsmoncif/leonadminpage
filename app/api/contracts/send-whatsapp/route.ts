import { NextResponse } from "next/server";
import { sendWhatsApp } from "@/lib/whatsapp";

export async function POST(req: Request) {
  try {
    const { phone, message, pdfUrl, contractId } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const result = await sendWhatsApp({
      to: phone,
      message: message || "",
      pdfUrl: pdfUrl || undefined,
      pdfFilename: contractId ? `Contract-${contractId}.pdf` : "Rental-Contract.pdf",
    });

    if (!result.success) {
      console.error("WhatsApp send error:", result.error);
      return NextResponse.json(
        { error: result.error || "Failed to send WhatsApp message" },
        { status: 500 }
      );
    }

    console.log(`WhatsApp message sent successfully via [${result.provider}] to:`, phone);
    return NextResponse.json({
      success: true,
      provider: result.provider,
      messageId: result.messageId,
      message: "WhatsApp message triggered successfully",
    });
  } catch (error: any) {
    console.error("WhatsApp Sending Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

