import https from "https";

/**
 * Unified WhatsApp Integration Module
 * Supports:
 * 1. Official Meta WhatsApp Business Cloud API (Primary / Production-grade / Zero-ban)
 * 2. UltraMsg WhatsApp API (Fallback if Meta credentials are not yet configured)
 */

export interface SendWhatsAppOptions {
  to: string;
  message: string;
  pdfUrl?: string;
  pdfBuffer?: Buffer;
  pdfFilename?: string;
}

export interface WhatsAppSendResult {
  success: boolean;
  provider: "meta" | "ultramsg" | "none";
  messageId?: string;
  error?: string;
}

/**
 * Normalizes phone numbers to Meta / WhatsApp international format (digits only, e.g. 213657829684)
 */
export function formatPhoneNumberForWhatsApp(phone: string): string {
  if (!phone) return "";
  let cleaned = phone.replace(/[^0-9+]/g, "").trim();

  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }

  if (cleaned.startsWith("00")) {
    cleaned = cleaned.substring(2);
  }

  // Handle national format: e.g. 05..., 06..., 07... (10 digits starting with 0 -> prefix +213)
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    cleaned = "213" + cleaned.substring(1);
  }

  // Handle 9-digit Algerian numbers without leading zero (e.g. 5..., 6..., 7...)
  if (cleaned.length === 9 && (cleaned.startsWith("5") || cleaned.startsWith("6") || cleaned.startsWith("7"))) {
    cleaned = "213" + cleaned;
  }

  return cleaned;
}

// Resilient Meta Edge hosts/IPs to bypass ISP/DNS IPv6 routing timeouts
const META_HOSTS = ["157.240.231.13", "graph.facebook.com"];

function metaHttpsRequest(
  path: string,
  method: string,
  headers: Record<string, string | number>,
  body?: Buffer | string
): Promise<{ status: number; data: any }> {
  return new Promise(async (resolve, reject) => {
    let lastError: any = null;

    for (const host of META_HOSTS) {
      try {
        const res = await new Promise<{ status: number; data: any }>((resResolve, resReject) => {
          const req = https.request(
            {
              hostname: host,
              port: 443,
              path,
              method,
              servername: "graph.facebook.com",
              headers: {
                Host: "graph.facebook.com",
                ...headers,
              },
              timeout: 8000,
            },
            (response) => {
              const chunks: Buffer[] = [];
              response.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
              response.on("end", () => {
                const raw = Buffer.concat(chunks).toString("utf8");
                try {
                  resResolve({ status: response.statusCode || 200, data: JSON.parse(raw) });
                } catch {
                  resResolve({ status: response.statusCode || 200, data: raw });
                }
              });
            }
          );

          req.on("timeout", () => {
            req.destroy();
            resReject(new Error(`Connection to Meta (${host}) timed out`));
          });

          req.on("error", (err) => {
            resReject(err);
          });

          if (body) {
            req.write(body);
          }
          req.end();
        });

        return resolve(res);
      } catch (err) {
        lastError = err;
        console.warn(`[WhatsApp] Meta request to host ${host} failed, trying next fallback:`, (err as any)?.message);
      }
    }

    reject(lastError || new Error("All Meta endpoints failed"));
  });
}

/**
 * Core function to send automated WhatsApp messages & PDF contracts
 */
export async function sendWhatsApp({
  to,
  message,
  pdfUrl,
  pdfBuffer,
  pdfFilename,
}: SendWhatsAppOptions): Promise<WhatsAppSendResult> {
  const recipient = formatPhoneNumberForWhatsApp(to);
  console.log(`[WhatsApp] Processing request to: ${to} -> formatted recipient: ${recipient}`);

  if (!recipient) {
    return { success: false, provider: "none", error: "Invalid or empty phone number" };
  }

  const metaToken = process.env.WHATSAPP_CLOUD_API_TOKEN || process.env.META_WHATSAPP_TOKEN;
  const metaPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_PHONE_NUMBER_ID;

  // 1. Official Meta WhatsApp Business Cloud API
  if (metaToken && metaPhoneId) {
    try {
      // 1A. If PDF buffer is provided, upload directly to Meta Media and send document
      if (pdfBuffer && pdfBuffer.length > 0) {
        try {
          const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
          const filename = pdfFilename || "Rental-Contract.pdf";

          let pre = `--${boundary}\r\nContent-Disposition: form-data; name="messaging_product"\r\n\r\nwhatsapp\r\n`;
          pre += `--${boundary}\r\nContent-Disposition: form-data; name="type"\r\n\r\napplication/pdf\r\n`;
          pre += `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/pdf\r\n\r\n`;
          const post = `\r\n--${boundary}--\r\n`;

          const fullBody = Buffer.concat([
            Buffer.from(pre, "utf8"),
            pdfBuffer,
            Buffer.from(post, "utf8"),
          ]);

          const uploadRes = await metaHttpsRequest(
            `/v21.0/${metaPhoneId}/media`,
            "POST",
            {
              Authorization: `Bearer ${metaToken}`,
              "Content-Type": `multipart/form-data; boundary=${boundary}`,
              "Content-Length": fullBody.length,
            },
            fullBody
          );

          if (uploadRes.status === 200 && uploadRes.data?.id) {
            const mediaId = uploadRes.data.id;
            console.log(`[WhatsApp] Meta Media uploaded successfully. ID: ${mediaId}`);

            const docPayload = JSON.stringify({
              messaging_product: "whatsapp",
              recipient_type: "individual",
              to: recipient,
              type: "document",
              document: {
                id: mediaId,
                caption: message || undefined,
                filename: filename,
              },
            });

            const sendDocRes = await metaHttpsRequest(
              `/v21.0/${metaPhoneId}/messages`,
              "POST",
              {
                Authorization: `Bearer ${metaToken}`,
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(docPayload),
              },
              docPayload
            );

            if (sendDocRes.status === 200 && sendDocRes.data?.messages?.[0]?.id) {
              const msgId = sendDocRes.data.messages[0].id;
              console.log(`[WhatsApp] Meta Document sent successfully! Msg ID: ${msgId} to ${recipient}`);
              return {
                success: true,
                provider: "meta",
                messageId: msgId,
              };
            } else {
              console.error("[WhatsApp] Meta Document Send failed, will fall back to text:", sendDocRes.data);
              // Don't return here — fall through to text message fallback
            }
          } else {
            console.error("[WhatsApp] Meta Media upload returned error:", uploadRes.data);
          }
        } catch (mediaErr: any) {
          console.error("[WhatsApp] Meta Media upload exception:", mediaErr.message || mediaErr);
        }
      }

      // 1B. If public PDF URL is provided
      const isPublicPdfUrl =
        pdfUrl &&
        !pdfUrl.includes("localhost") &&
        !pdfUrl.includes("127.0.0.1") &&
        (pdfUrl.startsWith("http://") || pdfUrl.startsWith("https://"));

      if (isPublicPdfUrl) {
        const docPayload = JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipient,
          type: "document",
          document: {
            link: pdfUrl,
            caption: message || undefined,
            filename: pdfFilename || "Rental-Contract.pdf",
          },
        });

        const sendRes = await metaHttpsRequest(
          `/v21.0/${metaPhoneId}/messages`,
          "POST",
          {
            Authorization: `Bearer ${metaToken}`,
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(docPayload),
          },
          docPayload
        );

        if (sendRes.status === 200 && sendRes.data?.messages?.[0]?.id) {
          return {
            success: true,
            provider: "meta",
            messageId: sendRes.data.messages[0].id,
          };
        }
      }

      // 1C. Standard Text Message via Meta
      const textPayload = JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "text",
        text: {
          preview_url: false,
          body: message,
        },
      });

      const textRes = await metaHttpsRequest(
        `/v21.0/${metaPhoneId}/messages`,
        "POST",
        {
          Authorization: `Bearer ${metaToken}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(textPayload),
        },
        textPayload
      );

      if (textRes.status === 200 && textRes.data?.messages?.[0]?.id) {
        const msgId = textRes.data.messages[0].id;
        console.log(`[WhatsApp] Meta Text message sent successfully! Msg ID: ${msgId} to ${recipient}`);
        return {
          success: true,
          provider: "meta",
          messageId: msgId,
        };
      } else {
        console.error("[WhatsApp] Meta Text Send failed:", textRes.data);
        return {
          success: false,
          provider: "meta",
          error: textRes.data?.error?.message || "Failed to send text message via Meta",
        };
      }
    } catch (metaErr: any) {
      console.error("[WhatsApp] Meta API top-level exception:", metaErr.message || metaErr);
    }
  }

  // 2. UltraMsg Fallback
  const ultraInstance = process.env.ULTRAMSG_INSTANCE_ID;
  const ultraToken = process.env.ULTRAMSG_TOKEN;

  if (ultraInstance && ultraToken) {
    try {
      if (pdfUrl) {
        const response = await fetch(`https://api.ultramsg.com/${ultraInstance}/messages/document`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            token: ultraToken,
            to: recipient,
            filename: pdfFilename || "Rental-Contract.pdf",
            document: pdfUrl,
            caption: message,
          }),
        });
        const data = await response.json();
        if (response.ok && !data.error) {
          return { success: true, provider: "ultramsg", messageId: String(data.id || "") };
        }
      }

      const response = await fetch(`https://api.ultramsg.com/${ultraInstance}/messages/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          token: ultraToken,
          to: recipient,
          body: message,
        }),
      });

      const data = await response.json();
      if (response.ok && !data.error) {
        return { success: true, provider: "ultramsg", messageId: String(data.id || "") };
      }
    } catch (ultraErr: any) {
      console.error("[WhatsApp] UltraMsg fallback error:", ultraErr.message || ultraErr);
    }
  }

  return {
    success: false,
    provider: "none",
    error: "No working WhatsApp provider available (Meta Cloud API or UltraMsg)",
  };
}
