const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const qrcode = require("qrcode");
const pino = require("pino");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
} = require("@whiskeysockets/baileys");

const app = express();
const PORT = process.env.WHATSAPP_PORT || 3005;
const AUTH_DIR = path.join(__dirname, "auth_info_baileys");

// Ensure large payloads (like PDF base64 buffers) are accepted
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

let sock = null;
let connectionStatus = "STARTING"; // "STARTING" | "SCAN_QR" | "CONNECTED" | "DISCONNECTED"
let currentQrDataUrl = null;
let connectedUser = null;
let connectedAt = null;

const logger = pino({ level: "silent" });

async function initWhatsApp() {
  try {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version, isLatest } = await fetchLatestBaileysVersion().catch(() => ({
      version: [2, 3000, 1015901307],
      isLatest: true,
    }));

    sock = makeWASocket({
      version,
      auth: state,
      logger,
      printQRInTerminal: false,
      browser: Browsers.ubuntu("Chrome"),
      syncFullHistory: false,
      generateHighQualityLinkPreview: true,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 30000,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          currentQrDataUrl = await qrcode.toDataURL(qr, {
            errorCorrectionLevel: "M",
            margin: 2,
            scale: 7,
          });
          connectionStatus = "SCAN_QR";
          console.log("\n=======================================================");
          console.log("  📸 SCAN THIS QR CODE WITH YOUR WHATSAPP APP:");
          console.log("=======================================================\n");
          qrcode.toString(qr, { type: "terminal", small: true }, (err, str) => {
            if (!err) console.log(str);
          });
          console.log("\n  -> Or open in browser at: http://localhost:3005");
          console.log("  -> Or in Settings page: http://localhost:3000/settings\n");
        } catch (qrErr) {
          console.error("[WhatsApp-Server] Failed to generate QR data URL:", qrErr);
        }
      }

      if (connection === "close") {
        const statusCode = (lastDisconnect?.error)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(`[WhatsApp-Server] Connection closed (code: ${statusCode}). Reconnect: ${shouldReconnect}`);

        currentQrDataUrl = null;
        connectedUser = null;
        connectionStatus = "DISCONNECTED";

        if (shouldReconnect) {
          connectionStatus = "STARTING";
          setTimeout(initWhatsApp, 3000);
        } else {
          console.log("[WhatsApp-Server] Logged out. Clearing credentials directory...");
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          } catch {}
          connectionStatus = "STARTING";
          setTimeout(initWhatsApp, 3000);
        }
      } else if (connection === "open") {
        connectionStatus = "CONNECTED";
        currentQrDataUrl = null;
        connectedUser = sock.user;
        connectedAt = new Date().toISOString();
        const displayPhone = sock.user?.id ? sock.user.id.split(":")[0] : "Connected";
        console.log(`[WhatsApp-Server] ✓ CONNECTED successfully as: ${displayPhone}`);
      }
    });
  } catch (err) {
    console.error("[WhatsApp-Server] Error initializing socket:", err);
    connectionStatus = "DISCONNECTED";
    setTimeout(initWhatsApp, 5000);
  }
}

// Format phone number to WhatsApp JID (e.g. "971589206713@s.whatsapp.net")
function formatToJid(phone) {
  if (!phone) return null;
  let cleaned = String(phone).replace(/[^0-9]/g, "").trim();

  // Handle national Algerian format 05/06/07...
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    cleaned = "213" + cleaned.substring(1);
  }

  // Handle UAE national format 050/052/054/055/056/058 (10 digits starting with 05 -> prefix 971)
  if (cleaned.startsWith("05") && cleaned.length === 10) {
    cleaned = "971" + cleaned.substring(1);
  }

  // Remove leading zeros
  cleaned = cleaned.replace(/^0+/, "");

  if (cleaned.length < 8) return null;
  return `${cleaned}@s.whatsapp.net`;
}

// 1. GET /status: Check connection status and QR code (JSON)
app.get("/status", (req, res) => {
  const displayPhone = connectedUser?.id ? connectedUser.id.split(":")[0] : null;
  res.json({
    status: connectionStatus,
    phone: displayPhone,
    user: connectedUser,
    qr: currentQrDataUrl,
    connectedAt,
    timestamp: new Date().toISOString(),
  });
});

// 1B. GET / & GET /qr: Visual HTML Dashboard & QR Viewer
app.get(["/", "/qr"], (req, res) => {
  const displayPhone = connectedUser?.id ? connectedUser.id.split(":")[0] : null;
  
  if (connectionStatus === "CONNECTED") {
    return res.send(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>WhatsApp Gateway - متصل</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
          .card { background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 40px; text-align: center; max-width: 480px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
          .badge { display: inline-block; background: #065f46; color: #34d399; font-weight: bold; font-size: 14px; padding: 6px 16px; border-radius: 9999px; margin-bottom: 20px; border: 1px solid #059669; }
          h1 { margin: 0 0 10px; font-size: 26px; }
          .phone { font-size: 22px; font-family: monospace; color: #38bdf8; margin: 15px 0; }
          p { color: #94a3b8; font-size: 14px; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">✓ متصل وجاهز للعمل (Connected)</div>
          <h1>خادم الواتساب التلقائي</h1>
          <div class="phone">+${displayPhone || "رقم هاتفك"}</div>
          <p>النظام متصل بنجاح وجاهز لإرسال تأكيدات الحجز وعقود الإيجار الموقعة بصيغة PDF تلقائياً ومجاناً للعملاء.</p>
        </div>
      </body>
      </html>
    `);
  }

  if (connectionStatus === "SCAN_QR" && currentQrDataUrl) {
    return res.send(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>امسح رمز QR - WhatsApp Gateway</title>
        <meta http-equiv="refresh" content="3">
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
          .card { background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 36px; text-align: center; max-width: 480px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
          .badge { display: inline-block; background: #78350f; color: #fde68a; font-weight: bold; font-size: 13px; padding: 6px 16px; border-radius: 9999px; margin-bottom: 16px; }
          h1 { margin: 0 0 10px; font-size: 22px; }
          p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 20px; }
          .qr-img { width: 280px; height: 280px; background: white; padding: 12px; border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); }
          .steps { text-align: right; margin-top: 24px; background: #0f172a; padding: 16px 20px; border-radius: 14px; border: 1px solid #334155; font-size: 13px; color: #cbd5e1; }
          .steps ol { margin: 8px 0 0; padding-right: 20px; }
          .steps li { margin-bottom: 6px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">📸 في انتظار مسح الرمز من هاتفك</div>
          <h1>امسح رمز QR لربط واتساب</h1>
          <p>افتح تطبيق واتساب على هاتفك وامسح الرمز أدناه للربط الفوري:</p>
          <img src="${currentQrDataUrl}" class="qr-img" alt="WhatsApp QR Code" />
          <div class="steps">
            <b>خطوات الربط:</b>
            <ol>
              <li>افتح تطبيق واتساب على هاتفك.</li>
              <li>اذهب إلى <b>الأجهزة المرتبطة (Linked Devices)</b>.</li>
              <li>اضغط على <b>ربط جهاز (Link a Device)</b>.</li>
              <li>وجّه الكاميرا نحو رمز QR أعلاه.</li>
            </ol>
          </div>
        </div>
      </body>
      </html>
    `);
  }

  // STARTING or DISCONNECTED
  return res.send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8">
      <title>جاري التهيئة... WhatsApp Gateway</title>
      <meta http-equiv="refresh" content="2">
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
        .card { background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 40px; text-align: center; max-width: 440px; }
        .spinner { width: 44px; height: 44px; border: 4px solid #334155; border-top-color: #10b981; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        h2 { margin: 0 0 10px; font-size: 20px; }
        p { color: #94a3b8; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="spinner"></div>
        <h2>جاري الاتصال بخوادم واتساب...</h2>
        <p>يتم تجهيز رمز الاستجابة السريعة (QR Code)، يرجى الانتظار 3 ثوانٍ فقط وسيعاد التحديث تلقائياً.</p>
      </div>
    </body>
    </html>
  `);
});

// 2. POST /send: Send text message and/or PDF document attachment
app.post("/send", async (req, res) => {
  try {
    if (connectionStatus !== "CONNECTED" || !sock) {
      return res.status(503).json({
        success: false,
        error: "WhatsApp server is not connected. Please scan QR code in settings first.",
        status: connectionStatus,
      });
    }

    const { to, message, pdfBase64, pdfUrl, pdfFilename } = req.body;
    const jid = formatToJid(to);

    if (!jid) {
      return res.status(400).json({
        success: false,
        error: `Invalid phone number: "${to}"`,
      });
    }

    let pdfBuffer = null;
    if (pdfBase64) {
      // Clean data URL prefix if present
      const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
      pdfBuffer = Buffer.from(cleanBase64, "base64");
    } else if (pdfUrl) {
      try {
        const fetchRes = await fetch(pdfUrl);
        if (fetchRes.ok) {
          const ab = await fetchRes.arrayBuffer();
          pdfBuffer = Buffer.from(ab);
        }
      } catch (fErr) {
        console.warn("[WhatsApp-Server] Failed to download PDF from URL:", fErr.message);
      }
    }

    let sentMsg = null;

    if (pdfBuffer && pdfBuffer.length > 0) {
      sentMsg = await sock.sendMessage(jid, {
        document: pdfBuffer,
        mimetype: "application/pdf",
        fileName: pdfFilename || "Rental-Contract.pdf",
        caption: message || undefined,
      });
      console.log(`[WhatsApp-Server] PDF document sent to ${jid} (${pdfFilename || "Rental-Contract.pdf"})`);
    } else if (message) {
      sentMsg = await sock.sendMessage(jid, {
        text: message,
      });
      console.log(`[WhatsApp-Server] Text message sent to ${jid}`);
    } else {
      return res.status(400).json({
        success: false,
        error: "No message or document provided to send",
      });
    }

    return res.json({
      success: true,
      messageId: sentMsg?.key?.id || null,
      to: jid,
    });
  } catch (sendErr) {
    console.error("[WhatsApp-Server] Failed to send message:", sendErr);
    return res.status(500).json({
      success: false,
      error: sendErr.message || "Failed to send WhatsApp message",
    });
  }
});

// 3. POST /disconnect: Logout and reset session
app.post("/disconnect", async (req, res) => {
  try {
    if (sock) {
      await sock.logout().catch(() => {});
    }
    try {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    } catch {}
    connectionStatus = "STARTING";
    currentQrDataUrl = null;
    connectedUser = null;
    setTimeout(initWhatsApp, 1500);
    res.json({ success: true, message: "Disconnected successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`  LEON FREE WHATSAPP GATEWAY running on port ${PORT}`);
  console.log(`  Status API: http://localhost:${PORT}/status`);
  console.log(`===================================================`);
  initWhatsApp();
});

