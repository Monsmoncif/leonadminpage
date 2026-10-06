import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const metaToken = process.env.WHATSAPP_CLOUD_API_TOKEN || process.env.META_WHATSAPP_TOKEN;
  const metaPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_PHONE_NUMBER_ID;
  const ultraInstance = process.env.ULTRAMSG_INSTANCE_ID;
  const ultraToken = process.env.ULTRAMSG_TOKEN;

  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    meta: {
      configured: Boolean(metaToken && metaPhoneId),
      phoneId: metaPhoneId || null,
      status: "unknown",
      details: null,
    },
    ultramsg: {
      configured: Boolean(ultraInstance && ultraToken),
      instanceId: ultraInstance || null,
      status: "unknown",
      details: null,
    },
  };

  // Test Meta Cloud API
  if (metaToken && metaPhoneId) {
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/${metaPhoneId}`, {
        headers: { Authorization: `Bearer ${metaToken}` },
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        diagnostics.meta.status = "CONNECTED";
        diagnostics.meta.details = data;
      } else {
        diagnostics.meta.status = "ERROR";
        diagnostics.meta.details = data.error || data;
      }
    } catch (err: any) {
      diagnostics.meta.status = "FAILED";
      diagnostics.meta.details = err.message;
    }
  } else {
    diagnostics.meta.status = "NOT_CONFIGURED";
  }

  // Test UltraMsg
  if (ultraInstance && ultraToken) {
    try {
      const res = await fetch(`https://api.ultramsg.com/${ultraInstance}/instance/status?token=${ultraToken}`);
      const data = await res.json();
      if (res.ok && !data.error) {
        diagnostics.ultramsg.status = "CONNECTED";
        diagnostics.ultramsg.details = data;
      } else {
        diagnostics.ultramsg.status = "ERROR";
        diagnostics.ultramsg.details = data.error || data;
      }
    } catch (err: any) {
      diagnostics.ultramsg.status = "FAILED";
      diagnostics.ultramsg.details = err.message;
    }
  } else {
    diagnostics.ultramsg.status = "NOT_CONFIGURED";
  }

  return NextResponse.json(diagnostics);
}
