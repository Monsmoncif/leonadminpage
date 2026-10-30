export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Contract } from "@/models/Contract";
import { Client } from "@/models/Client";
import { buildPrivacyConsentHtml } from "@/lib/privacy-consent-template";
import puppeteer from "puppeteer-core";
import fs from "fs";

const consentPdfCache = new Map<string, { buffer: Buffer; updatedAt?: string; timestamp: number }>();

export function clearConsentPdfCache(contractId?: string) {
  if (contractId) {
    consentPdfCache.delete(contractId);
  } else {
    consentPdfCache.clear();
  }
}

function getBrowserExecutablePath(): string | null {
  const possiblePaths = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_BIN,
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/snap/bin/chromium",
    "/usr/local/bin/chrome",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ].filter(Boolean) as string[];

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      // ignore
    }
  }
  return null;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing contract id" }, { status: 400 });
    }

    await connectDB();
    const mongoose = (await import("mongoose")).default;
    const _c = Client; // Ensure model registration

    let contract: any = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      contract = await Contract.findById(id)
        .populate({ path: "clientId", strictPopulate: false })
        .populate({ path: "unitId", strictPopulate: false })
        .lean();
    }
    if (!contract && !isNaN(Number(id))) {
      contract = await Contract.findOne({ contractNumber: Number(id) })
        .populate({ path: "clientId", strictPopulate: false })
        .populate({ path: "unitId", strictPopulate: false })
        .lean();
    }

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Guarantee latest client directly from database to catch any client edits
    if (contract.clientId) {
      const cId = typeof contract.clientId === "object" ? (contract.clientId._id || contract.clientId.id) : contract.clientId;
      if (cId && mongoose.Types.ObjectId.isValid(cId)) {
        try {
          const freshClient = await Client.findById(cId).lean();
          if (freshClient) contract.clientId = freshClient;
        } catch {}
      }
    }

    const url = new URL(req.url);
    const contractNum = contract.contractNumber || id;
    const isDownload = url.searchParams.get("download") === "1";
    const disposition = isDownload ? "attachment" : "inline";
    const forceFresh = url.searchParams.get("fresh") === "1" || url.searchParams.has("t");

    const contractUpdatedAt = contract.updatedAt ? new Date(contract.updatedAt).toISOString() : "";
    const clientDoc = (contract.clientId && typeof contract.clientId === "object") ? contract.clientId : {};
    const clientUpdatedAt = clientDoc.updatedAt ? new Date(clientDoc.updatedAt).toISOString() : "";
    const versionKey = `${contractUpdatedAt}_${clientUpdatedAt}`;

    const cached = consentPdfCache.get(id);

    if (!forceFresh && cached && (!versionKey || cached.updatedAt === versionKey) && (Date.now() - cached.timestamp < 10 * 60 * 1000)) {
      return new NextResponse(new Uint8Array(cached.buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `${disposition}; filename="Privacy_Consent_${contractNum}.pdf"`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    // Build standalone HTML matching the Cardoo Privacy Notice document
    const html = buildPrivacyConsentHtml(contract);

    const execPath = getBrowserExecutablePath();
    if (!execPath) {
      return new NextResponse(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    let browser: any = null;
    try {
      browser = await puppeteer.launch({
        executablePath: execPath,
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-first-run",
          "--no-default-browser-check",
          "--disable-extensions",
          "--ignore-certificate-errors",
          "--allow-insecure-localhost",
          "--disable-web-security",
        ],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "12mm",
          right: "15mm",
          bottom: "12mm",
          left: "15mm",
        },
      });

      await page.close();
      await browser.close();
      browser = null;

      consentPdfCache.set(id, {
        buffer: pdfBuffer,
        updatedAt: versionKey,
        timestamp: Date.now(),
      });
      if (contract.contractNumber) {
        consentPdfCache.set(String(contract.contractNumber), {
          buffer: pdfBuffer,
          updatedAt: versionKey,
          timestamp: Date.now(),
        });
      }

      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `${disposition}; filename="Privacy_Consent_${contractNum}.pdf"`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    } catch (renderErr) {
      console.warn("Puppeteer PDF generation failed, returning HTML fallback:", renderErr);
      if (browser) {
        try {
          await browser.close();
        } catch {}
      }
      return new NextResponse(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }
  } catch (error: any) {
    console.error("Error generating consent PDF:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate consent PDF" },
      { status: 500 }
    );
  }
}
