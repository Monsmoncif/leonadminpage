import { NextResponse } from "next/server";
import { sendDriverTaskNotification } from "@/lib/contract-notifications";

export async function POST(req: Request) {
  try {
    const { driverId, contractId, type } = await req.json();

    if (!driverId || !contractId) {
      return NextResponse.json({ error: "driverId and contractId are required" }, { status: 400 });
    }

    const results = await sendDriverTaskNotification(driverId, contractId, type || "delivery_assigned");

    return NextResponse.json({ 
      success: true, 
      results,
      message: `Driver notification sent — Email: ${results.email ? '✓' : '✗'}, WhatsApp: ${results.whatsapp ? '✓' : '✗'}` 
    });
  } catch (error: any) {
    console.error("Notify Driver Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
