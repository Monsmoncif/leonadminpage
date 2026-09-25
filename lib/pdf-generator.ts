import PDFDocument from "pdfkit";
import puppeteer from "puppeteer-core";
import fs from "fs";

export interface ContractPdfData {
  contractNumber: string | number;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  clientIdNumber?: string;
  clientLicense?: string;
  vehicleName: string;
  vehiclePlate: string;
  vehicleColor?: string;
  vehicleYear?: string | number;
  checkoutMileage?: number;
  checkoutFuelLevel?: number;
  startDate: string;
  endDate: string;
  totalDays: number;
  dailyRate: number;
  depositAmount: number;
  totalAmount: number;
  paymentMethod: string;
  salikCharge?: number;
  parkingCharge?: number;
  finesCharge?: number;
  fuelCharge?: number;
  notes?: string;
  customerSignature?: string; // base64 or data uri
  createdAt?: string;
}

function getBrowserExecutablePath(): string | null {
  const possiblePaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      // ignore
    }
  }
  return null;
}

let globalBrowser: any = null;
let browserLaunchingPromise: Promise<any> | null = null;

async function getOrCreateBrowser(execPath: string): Promise<any> {
  if (globalBrowser && globalBrowser.isConnected()) {
    return globalBrowser;
  }

  if (browserLaunchingPromise) {
    return browserLaunchingPromise;
  }

  browserLaunchingPromise = (async () => {
    try {
      const browser = await puppeteer.launch({
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
          "--disable-sync",
        ],
      });

      browser.on("disconnected", () => {
        globalBrowser = null;
      });

      globalBrowser = browser;
      return browser;
    } finally {
      browserLaunchingPromise = null;
    }
  })();

  return browserLaunchingPromise;
}

/**
 * Generates the EXACT contract PDF matching the Admin Print page (/bookings/[id]/print)
 * 100% identical to the contract that admin prints out.
 */
export async function generateContractPdfFromPrintUrl(
  contractId: string,
  fallbackData?: ContractPdfData
): Promise<Buffer> {
  const execPath = getBrowserExecutablePath();
  if (execPath) {
    let page: any = null;
    try {
      const browser = await getOrCreateBrowser(execPath);
      page = await browser.newPage();

      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const printUrl = `${baseUrl}/bookings/${contractId}/print?noprint=1`;

      await page.goto(printUrl, { waitUntil: "domcontentloaded", timeout: 10000 });
      await page.waitForSelector("#contract-print-content", { timeout: 8000 });
      // Brief pause to allow fonts, signatures, and dynamic layout to settle
      await new Promise((resolve) => setTimeout(resolve, 200));

      const pdfUint8Array = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "6mm", bottom: "6mm", left: "5mm", right: "5mm" },
      });

      await page.close();
      page = null;

      const pdfBuffer = Buffer.from(pdfUint8Array);
      console.log(`[PdfGenerator] Rendered exact admin print contract (${pdfBuffer.length} bytes) for #${contractId}`);
      return pdfBuffer;
    } catch (browserErr) {
      console.error("[PdfGenerator] Failed to render via headless browser, falling back to pdfkit:", browserErr);
      if (page) {
        try { await page.close(); } catch {}
      }
    }
  }

  // Fallback to pdfkit if browser not available or error occurred
  if (fallbackData) {
    return generateContractPdf(fallbackData);
  }
  throw new Error("Could not generate PDF from print URL or fallback data");
}

/**
 * Generates an official, beautifully styled PDF Contract buffer
 */
export async function generateContractPdf(data: ContractPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 36, bottom: 36, left: 36, right: 36 },
        info: {
          Title: `Rental-Contract-${data.contractNumber}`,
          Author: "Leon Rent Car",
        },
      });

      const buffers: Buffer[] = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      const primaryColor = "#0f172a";
      const brandColor = "#2563eb";
      const lightBg = "#f8fafc";
      const borderColor = "#cbd5e1";

      // --- HEADER ---
      doc.rect(36, 36, 523, 60).fill("#1e293b");

      doc.fillColor("#ffffff").fontSize(20).font("Helvetica-Bold").text("LEON RENT CAR", 50, 48);
      doc.fontSize(9).font("Helvetica").fillColor("#94a3b8").text("Luxury & Commercial Vehicle Rentals — Car Rental Agreement", 50, 72);

      doc.fillColor("#ffffff").fontSize(12).font("Helvetica-Bold").text(`CONTRACT #${data.contractNumber}`, 380, 50, { align: "right", width: 165 });
      doc.fontSize(8).font("Helvetica").fillColor("#cbd5e1").text(`Date: ${data.createdAt || new Date().toLocaleDateString("en-GB")}`, 380, 70, { align: "right", width: 165 });

      let y = 110;

      // Section: HIRER & VEHICLE DETAILS (2 COLUMNS)
      const colWidth = 255;
      const colGap = 13;
      const leftColX = 36;
      const rightColX = leftColX + colWidth + colGap;

      // Box 1: Customer Details
      doc.rect(leftColX, y, colWidth, 130).fillAndStroke(lightBg, borderColor);
      doc.fillColor(primaryColor).fontSize(10).font("Helvetica-Bold").text("1. HIRER (CUSTOMER) DETAILS", leftColX + 12, y + 10);
      doc.strokeColor(brandColor).lineWidth(1.5).moveTo(leftColX + 12, y + 24).lineTo(leftColX + 180, y + 24).stroke();

      doc.fontSize(8.5).font("Helvetica").fillColor("#334155");
      let itemY = y + 32;
      doc.text(`Full Name:`, leftColX + 12, itemY);
      doc.font("Helvetica-Bold").text(data.clientName || "N/A", leftColX + 85, itemY);
      
      itemY += 16;
      doc.font("Helvetica").text(`Phone:`, leftColX + 12, itemY);
      doc.font("Helvetica-Bold").text(data.clientPhone || "N/A", leftColX + 85, itemY);

      itemY += 16;
      doc.font("Helvetica").text(`Email:`, leftColX + 12, itemY);
      doc.font("Helvetica-Bold").text(data.clientEmail || "N/A", leftColX + 85, itemY);

      itemY += 16;
      doc.font("Helvetica").text(`ID / Passport:`, leftColX + 12, itemY);
      doc.font("Helvetica-Bold").text(data.clientIdNumber || "Verified", leftColX + 85, itemY);

      itemY += 16;
      doc.font("Helvetica").text(`Driving License:`, leftColX + 12, itemY);
      doc.font("Helvetica-Bold").text(data.clientLicense || "Verified", leftColX + 85, itemY);

      // Box 2: Vehicle Details
      doc.rect(rightColX, y, colWidth, 130).fillAndStroke(lightBg, borderColor);
      doc.fillColor(primaryColor).fontSize(10).font("Helvetica-Bold").text("2. VEHICLE DETAILS", rightColX + 12, y + 10);
      doc.strokeColor(brandColor).lineWidth(1.5).moveTo(rightColX + 12, y + 24).lineTo(rightColX + 150, y + 24).stroke();

      itemY = y + 32;
      doc.fontSize(8.5).font("Helvetica").fillColor("#334155");
      doc.text(`Vehicle:`, rightColX + 12, itemY);
      doc.font("Helvetica-Bold").text(`${data.vehicleName} ${data.vehicleYear || ""}`, rightColX + 85, itemY);

      itemY += 16;
      doc.font("Helvetica").text(`Plate Number:`, rightColX + 12, itemY);
      doc.font("Helvetica-Bold").text(data.vehiclePlate || "N/A", rightColX + 85, itemY);

      itemY += 16;
      doc.font("Helvetica").text(`Color:`, rightColX + 12, itemY);
      doc.font("Helvetica-Bold").text(data.vehicleColor || "N/A", rightColX + 85, itemY);

      itemY += 16;
      doc.font("Helvetica").text(`Initial Odometer:`, rightColX + 12, itemY);
      doc.font("Helvetica-Bold").text(`${data.checkoutMileage || 0} km`, rightColX + 85, itemY);

      itemY += 16;
      doc.font("Helvetica").text(`Fuel Level:`, rightColX + 12, itemY);
      doc.font("Helvetica-Bold").text(`${data.checkoutFuelLevel || 100}%`, rightColX + 85, itemY);

      y += 145;

      // Section: RENTAL PERIOD & FINANCIAL SUMMARY
      // Box 3: Logistics & Period
      doc.rect(leftColX, y, colWidth, 120).fillAndStroke(lightBg, borderColor);
      doc.fillColor(primaryColor).fontSize(10).font("Helvetica-Bold").text("3. RENTAL PERIOD", leftColX + 12, y + 10);
      doc.strokeColor(brandColor).lineWidth(1.5).moveTo(leftColX + 12, y + 24).lineTo(leftColX + 140, y + 24).stroke();

      itemY = y + 32;
      doc.fontSize(8.5).font("Helvetica").fillColor("#334155");
      doc.text(`Pickup Date:`, leftColX + 12, itemY);
      doc.font("Helvetica-Bold").text(data.startDate, leftColX + 85, itemY);

      itemY += 16;
      doc.font("Helvetica").text(`Return Date:`, leftColX + 12, itemY);
      doc.font("Helvetica-Bold").text(data.endDate, leftColX + 85, itemY);

      itemY += 16;
      doc.font("Helvetica").text(`Total Duration:`, leftColX + 12, itemY);
      doc.font("Helvetica-Bold").text(`${data.totalDays} Days`, leftColX + 85, itemY);

      itemY += 16;
      doc.font("Helvetica").text(`Daily Rate:`, leftColX + 12, itemY);
      doc.font("Helvetica-Bold").text(`$${data.dailyRate}/day`, leftColX + 85, itemY);

      // Box 4: Financial Settlement
      doc.rect(rightColX, y, colWidth, 120).fillAndStroke(lightBg, borderColor);
      doc.fillColor(primaryColor).fontSize(10).font("Helvetica-Bold").text("4. FINANCIAL SUMMARY", rightColX + 12, y + 10);
      doc.strokeColor(brandColor).lineWidth(1.5).moveTo(rightColX + 12, y + 24).lineTo(rightColX + 160, y + 24).stroke();

      itemY = y + 32;
      doc.fontSize(8.5).font("Helvetica").fillColor("#334155");
      doc.text(`Rental Charges:`, rightColX + 12, itemY);
      doc.font("Helvetica-Bold").text(`$${data.totalAmount}`, rightColX + 110, itemY);

      itemY += 16;
      doc.font("Helvetica").text(`Security Deposit:`, rightColX + 12, itemY);
      doc.font("Helvetica-Bold").text(`$${data.depositAmount}`, rightColX + 110, itemY);

      itemY += 16;
      doc.font("Helvetica").text(`Payment Method:`, rightColX + 12, itemY);
      doc.font("Helvetica-Bold").text(data.paymentMethod || "Cash", rightColX + 110, itemY);

      const extraCharges = (Number(data.salikCharge) || 0) + (Number(data.parkingCharge) || 0) + (Number(data.finesCharge) || 0) + (Number(data.fuelCharge) || 0);
      const totalDue = Number(data.totalAmount || 0) + Number(data.depositAmount || 0) + extraCharges;

      itemY += 18;
      doc.rect(rightColX + 10, itemY - 2, colWidth - 20, 22).fill("#e2e8f0");
      doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(9.5).text(`AMOUNT DUE: $${totalDue.toFixed(2)}`, rightColX + 18, itemY + 3);

      y += 135;

      // Section: SPECIAL INSTRUCTIONS & NOTES (IF ANY)
      if (data.notes) {
        doc.rect(leftColX, y, 523, 40).fillAndStroke("#fffbeb", "#fde68a");
        doc.fillColor("#92400e").fontSize(8.5).font("Helvetica-Bold").text("Special Instructions / Notes:", leftColX + 10, y + 8);
        doc.font("Helvetica").text(data.notes, leftColX + 10, y + 22, { width: 503 });
        y += 50;
      }

      // Section: SIGNATURES & ACKNOWLEDGEMENT
      const sigHeight = 110;
      doc.rect(leftColX, y, 523, sigHeight).fillAndStroke(lightBg, borderColor);
      doc.fillColor(primaryColor).fontSize(10).font("Helvetica-Bold").text("5. SIGNATURES & ACKNOWLEDGEMENT", leftColX + 12, y + 10);
      doc.fontSize(7.5).font("Helvetica").fillColor("#64748b").text(
        "By signing below, the Hirer confirms inspection and receipt of the vehicle in good condition, and agrees to all rental terms.",
        leftColX + 12, y + 24, { width: 500 }
      );

      // Customer Signature Box
      const sigBoxW = 230;
      const sigBoxH = 55;
      const sigY = y + 42;

      doc.rect(leftColX + 15, sigY, sigBoxW, sigBoxH).fillAndStroke("#ffffff", "#e2e8f0");
      doc.fillColor("#64748b").fontSize(7.5).font("Helvetica").text("Customer / Hirer Signature (توقيع العميل)", leftColX + 22, sigY + 5);

      // If base64 customer signature exists, embed image
      if (data.customerSignature && data.customerSignature.startsWith("data:image")) {
        try {
          const base64Data = data.customerSignature.split(",")[1];
          const imgBuffer = Buffer.from(base64Data, "base64");
          doc.image(imgBuffer, leftColX + 25, sigY + 16, { fit: [180, 34] });
        } catch (imgErr) {
          console.error("Failed to render customer signature in PDF:", imgErr);
        }
      }

      // Staff Signature Box
      doc.rect(rightColX, sigY, sigBoxW, sigBoxH).fillAndStroke("#ffffff", "#e2e8f0");
      doc.fillColor("#64748b").fontSize(7.5).font("Helvetica").text("Authorized Staff / Company Stamp (توقيع الموظف)", rightColX + 7, sigY + 5);
      doc.fillColor("#0f172a").fontSize(9).font("Helvetica-Bold").text("Leon Rent Car", rightColX + 10, sigY + 22);
      doc.fontSize(7.5).font("Helvetica").fillColor("#64748b").text("Approved & Handover Confirmed", rightColX + 10, sigY + 36);

      y += sigHeight + 15;

      // Section: KEY TERMS & CONDITIONS (COMPACT LEGAL FOOTER)
      doc.rect(leftColX, y, 523, 110).fillAndStroke("#f1f5f9", "#e2e8f0");
      doc.fillColor(primaryColor).fontSize(8.5).font("Helvetica-Bold").text("TERMS & CONDITIONS SUMMARY / ملخص الشروط والأحكام", leftColX + 12, y + 8);
      
      const termsText = 
        "1. The Hirer agrees to return the vehicle on the specified return date and time in the same mechanical and physical condition.\n" +
        "2. The vehicle is provided with insurance coverage subject to the terms of the policy. Negligent operation or unlicensed drivers void coverage.\n" +
        "3. Any traffic violations, toll fees, fines, or fuel shortages during the rental period are the sole responsibility of the Hirer.\n" +
        "4. Unauthorized subleasing, reckless driving, or off-road driving is strictly prohibited.\n" +
        "5. The security deposit will be refunded upon vehicle inspection and clearance of all potential traffic fines within the agreed timeframe.";

      doc.fontSize(7.2).font("Helvetica").fillColor("#475569").text(termsText, leftColX + 12, y + 24, { width: 500, lineGap: 2 });

      // Footer brand note
      doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#94a3b8").text("Leon Rent Car — +213 541 77 08 49 — Official Vehicle Rental Agreement", 36, 785, { align: "center", width: 523 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
