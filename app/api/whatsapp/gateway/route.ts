import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GATEWAY_URL = process.env.LOCAL_WHATSAPP_URL || "http://127.0.0.1:3005";

export async function GET() {
  try {
    const res = await fetch(`${GATEWAY_URL}/status`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      return NextResponse.json({
        online: false,
        status: "OFFLINE",
        error: `Server responded with status ${res.status}`,
      });
    }

    const data = await res.json();
    return NextResponse.json({
      online: true,
      ...data,
    });
  } catch (err: any) {
    return NextResponse.json({
      online: false,
      status: "OFFLINE",
      error: "WhatsApp local server is not running on port 3005. Run 'npm run whatsapp' to start it.",
    });
  }
}


export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action || "test";

    if (action === "disconnect") {
      const res = await fetch(`${GATEWAY_URL}/disconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(data);
    }

    if (action === "pair") {
      const res = await fetch(`${GATEWAY_URL}/pair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: body.phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        return NextResponse.json({ error: data.error || "Failed to generate pairing code" }, { status: 400 });
      }
      return NextResponse.json({ success: true, code: data.code });
    }

    if (action === "test") {
      const phone = body.phone;
      if (!phone) {
        return NextResponse.json({ error: "Phone number required" }, { status: 400 });
      }

      const res = await fetch(`${GATEWAY_URL}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: phone,
          message: body.message || "👋 مرحباً! هذه رسالة تجريبية لتأكيد ربط واتساب بنجاح من نظام Leon Car Rental. 🚗✨",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        return NextResponse.json({ error: data.error || "Failed to send message" }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        messageId: data.messageId,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

