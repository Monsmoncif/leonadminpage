import { NextResponse } from "next/server";
import { sendClientContractNotification } from "@/lib/contract-notifications";

export async function POST(req: Request) {
  try {
    const { contractId, type } = await req.json();

    if (!contractId) {
      return NextResponse.json({ error: "contractId is required" }, { status: 400 });
    }

    const results = await sendClientContractNotification(contractId, type || "created");

    return NextResponse.json({ 
      success: true, 
      results,
      message: `Client notification sent — Email: ${results.email ? '✓' : '✗'}, WhatsApp: ${results.whatsapp ? '✓' : '✗'}` 
    });
  } catch (error: any) {
    console.error("Send Client Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
