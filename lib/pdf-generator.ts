import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
import connectDB from "@/lib/db";
import { Contract } from "@/models/Contract";
import { Client } from "@/models/Client";
import { Unit } from "@/models/Unit";
import { User } from "@/models/User";
import { CONTRACT_TERMS } from "@/lib/contractTerms";
import { isResidentClient } from "@/lib/client-utils";

export interface ContractPdfData {
  contractNumber: string | number;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  clientIdNumber?: string;
  clientType?: string;
  clientLicense?: string;
  licenseIssuedBy?: string;
  licenseIssuedDate?: string;
  licenseExpiry?: string;
  internationalLicenseNumber?: string;
  passportNumber?: string;
  passportIssuedBy?: string;
  passportExpiry?: string;
  nationality?: string;
  documents?: string[];
  vehicleName: string;
  vehiclePlate: string;
  vehicleColor?: string;
  vehicleYear?: string | number;
  checkoutMileage?: number;
  checkoutFuelLevel?: number;
  startDate: string;
  endDate: string;
  returnedAt?: string | Date;
  status?: string;
  deliveryStatus?: string;
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
  customerSignature?: string;
  createdAt?: string;
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

function formatDateDisplay(dateVal: any): string {
  if (!dateVal) return "";
  try {
    if (typeof dateVal === "string") {
      const trimmed = dateVal.trim();
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
        return trimmed;
      }
      const match = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
      if (match) {
        const year = match[1];
        const month = match[2].padStart(2, "0");
        const day = match[3].padStart(2, "0");
        return `${day}/${month}/${year}`;
      }
    }
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateVal);
  }
}

/**
 * Builds the complete, 100% authentic HTML of the official Leon Car Rental 2-page contract agreement
 * (Identical to /bookings/[id]/print page)
 */
export function buildRealContractHtml(contract: any): string {
  const client = contract.clientId || {};
  const unit = contract.unitId || {};
  const serialNo = contract.contractNumber || (contract._id ? contract._id.toString().substring(0, 8).toUpperCase() : "2240");
  const isPersonalized = Boolean(contract.contractType === "Personalized" || contract.personalizedPersonName);
  const isReturned = contract.status === "Completed" || contract.deliveryStatus === "Returned" || Boolean(contract.returnedAt);

  const isResident = isResidentClient(client, contract);
  const isForeigner = !isResident;

  let logoBase64 = "";
  try {
    const logoBuf = fs.readFileSync(path.join(process.cwd(), "public", "logo-original.png"));
    logoBase64 = `data:image/png;base64,${logoBuf.toString("base64")}`;
  } catch (e) {}

  let adminSignBase64 = contract.adminSignature || "";
  if (!adminSignBase64) {
    try {
      const signBuf = fs.readFileSync(path.join(process.cwd(), "public", "images", "admin-signature.png"));
      adminSignBase64 = `data:image/png;base64,${signBuf.toString("base64")}`;
    } catch (e) {}
  }

  const INSPECTION_ANGLES = [
    { en: "Front View", ar: "الأمام" },
    { en: "Rear View", ar: "الخلف" },
    { en: "Left Side", ar: "اليسار" },
    { en: "Right Side", ar: "اليمين" },
    { en: "Dashboard / KM", ar: "العداد" },
    { en: "Front Interior", ar: "الصالون" },
    { en: "Rear Interior", ar: "المقاعد" },
    { en: "Trunk / Boot", ar: "الصندوق" },
  ];

  const handoverDisplay = `${formatDateDisplay(contract.deliveredAt || contract.startDate)} - ${contract.checkoutTime || "08:00 AM"}`;
  const returnDisplay = isReturned
    ? `${formatDateDisplay(contract.returnedAt || contract.endDate)} - ${contract.checkinTime || "N/A"}`
    : (contract.endDate ? formatDateDisplay(contract.endDate) : "N/A");
  const returnMileageDisplay = isReturned
    ? (contract.returnOdometer || contract.returnMileage || unit.mileage || "N/A")
    : "";

  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="utf-8" />
  <title>${serialNo}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 10px; color: #111827; background: #fff; }
    @page { size: A4 portrait; margin: 6mm 5mm 6mm 5mm; }
    .page-break { page-break-before: always; break-before: page; }
    .border-b-black { border-bottom: 1px solid #000; }
    .border-r-black { border-right: 1px solid #000; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; }
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); }
    .grid-12 { display: grid; grid-template-columns: repeat(12, 1fr); }
    .col-5 { grid-column: span 5; }
    .col-7 { grid-column: span 7; }
    .col-span-2 { grid-column: span 2; }
    .bg-gray-50 { background-color: #f9fafb; }
    .bg-gray-100 { background-color: #f3f4f6; }
    .term-row { page-break-inside: avoid; break-inside: avoid; border-bottom: 1px solid #f3f4f6; padding: 1px 0; }
  </style>
</head>
<body>
  <!-- PAGE 1: OFFICIAL CONTRACT FORM -->
  <div style="border: 1.5px solid #000; padding: 10px; background: #fff; position: relative;">
    <!-- HEADER -->
    <div style="background-color: #181818; color: #fff; margin: -10px -10px 6px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #EEA21B;">
      <div style="width: 28%;">
        ${logoBase64 ? `<img src="${logoBase64}" style="height: 44px; object-fit: contain;" />` : `<strong style="color: #EEA21B; font-size: 16px;">LEON RENT CAR</strong>`}
      </div>
      <div style="text-align: center; flex: 1;">
        <div style="font-size: 16px; font-weight: 900; direction: rtl;"><span style="color: #EEA21B;">ليــون </span><span>لتأجير السيارات</span></div>
        <div style="font-size: 13px; font-weight: 900; letter-spacing: 1px;"><span style="color: #EEA21B;">LEON </span><span>CAR RENTAL</span></div>
        <div style="width: 180px; height: 1.5px; background: #EEA21B; margin: 4px auto 0;"></div>
      </div>
      <div style="width: 36%; font-size: 7px; font-weight: bold; color: #f3f4f6; text-align: right; line-height: 1.3;">
        <div>📞 +971 589 206 713</div>
        <div>📍 19D Street - Al Quoz Industrial Area 3 - Dubai</div>
        <div>📘 LEON CAR Rental Dubai</div>
        <div>📸 Leon_car_rantel_dubai</div>
      </div>
    </div>

    <!-- TITLE BAR -->
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 3px 6px; border-bottom: 2px solid #000; background: #f9fafb; margin-bottom: 4px;">
      <div style="font-weight: 900; font-size: 9px; text-transform: uppercase;">
        ${isPersonalized ? "PERSONAL AGREEMENT" : "RENTAL AGREEMENT"} | <span style="direction: rtl;">${isPersonalized ? "عقد استخدام شخصي ومخصص" : "عقد إيجار مركبة"}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 4px; background: #fff; padding: 2px 6px; border: 1px solid #d1d5db; border-radius: 4px;">
        <span style="font-weight: bold; font-size: 8px; color: #4b5563;">Agreement No / رقم العقد:</span>
        <span style="font-weight: 900; font-size: 11px; color: #dc2626;">${serialNo}</span>
      </div>
    </div>

    <!-- LOCATION & DATES -->
    <div class="grid-4 border-b-black" style="font-size: 7px;">
      <div class="border-r-black" style="padding: 2px 4px;">
        <div style="font-size: 6px; color: #6b7280; font-weight: bold;">LOCATION / منفذ البيع</div>
        <div style="font-weight: bold; font-size: 8px;">${contract.pickupLocation || "Main Office"}</div>
      </div>
      <div class="border-r-black" style="padding: 2px 4px; display: flex; align-items: center; justify-content: center; gap: 8px;">
        <span style="font-weight: bold;">${contract.rentalType === "Monthly" ? "☑ Monthly / شهري" : "☑ Daily / يومي"}</span>
      </div>
      <div class="border-r-black" style="padding: 2px 4px;">
        <div style="font-size: 6px; color: #6b7280; font-weight: bold;">HA DATE / تاريخ الاتفاقية</div>
        <div style="font-weight: 900; font-size: 8px;">${formatDateDisplay(contract.startDate)}</div>
      </div>
      <div style="padding: 2px 4px;">
        <div style="font-size: 6px; color: #6b7280; font-weight: bold;">HIRE MODE / نوع الاستئجار</div>
        <div style="font-weight: bold; font-size: 8px;">${isPersonalized ? "Personal Use / شخصي" : (contract.driverId ? "Chauffeur Driven" : "Self-Drive")}</div>
      </div>
    </div>

    <!-- DUAL COLUMN -->
    <div class="grid-12 border-b-black">
      <!-- HIRER INFO (Col Span 5) -->
      <div class="col-5 border-r-black" style="display: flex; flex-direction: column;">
        <div class="bg-gray-100 border-b-black" style="padding: 2px 4px; display: flex; justify-content: space-between; font-weight: bold; font-size: 7.5px;">
          <span>HIRER INFORMATION</span>
          <span style="direction: rtl;">معلومات المستأجر</span>
        </div>
        <div class="border-b-black" style="padding: 2px 4px;">
          <div style="font-size: 6px; color: #6b7280; font-weight: bold;">NAME / الاسم</div>
          <div style="font-weight: 900; font-size: 8.5px;">${isPersonalized ? (contract.personalizedPersonName || client.name || "Personal Use") : (client.name || contract.personalizedPersonName || "N/A")}</div>
        </div>
        <div class="grid-2 border-b-black" style="font-size: 6.5px;">
          <div class="border-r-black" style="padding: 2px 4px;">
            <div style="font-size: 6px; color: #6b7280;">DRIVING LICENSE NO / رقم الرخصة</div>
            <div style="font-weight: bold;">${client.licenseNumber || "N/A"}</div>
          </div>
          <div style="padding: 2px 4px;">
            <div style="font-size: 6px; color: #6b7280;">CUSTOMER TYPE / نوع العميل</div>
            <div style="font-weight: bold;">${isPersonalized ? "Personal / شخصي" : (contract.customerType || "B2C")}</div>
          </div>
        </div>
        <div class="grid-2 border-b-black" style="font-size: 6.5px;">
          <div class="border-r-black" style="padding: 2px 4px;">
            <div style="font-size: 6px; color: #6b7280;">LICENSE ISSUE DATE / تاريخ إصدار الرخصة</div>
            <div style="font-weight: bold;">${formatDateDisplay(client.licenseIssuedDate) || client.licenseIssuedBy || "N/A"}</div>
          </div>
          <div style="padding: 2px 4px;">
            <div style="font-size: 6px; color: #6b7280;">LICENSE EXPIRY / انتهاء الرخصة</div>
            <div style="font-weight: bold;">${formatDateDisplay(client.licenseExpiry) || "N/A"}</div>
          </div>
        </div>
        <div class="grid-2 border-b-black" style="font-size: 6.5px;">
          <div class="border-r-black" style="padding: 2px 4px;">
            <div style="font-size: 6px; color: #6b7280;">${isForeigner ? "PASSPORT NO / جواز السفر" : "EMIRATES ID NO / رقم الهوية"}</div>
            <div style="font-weight: bold;">${!isForeigner ? (client.idNumber || contract.customerIdNumber || client.passportNumber || "N/A") : (client.passportNumber || contract.passportNumber || client.idNumber || "N/A")}</div>
          </div>
          <div style="padding: 2px 4px;">
            <div style="font-size: 6px; color: #6b7280;">${isForeigner ? "PASSPORT EXPIRY / انتهاء الجواز" : "ID EXPIRY / انتهاء الهوية"}</div>
            <div style="font-weight: bold;">${!isForeigner ? (formatDateDisplay(client.idExpiry || contract.customerIdExpiry || client.passportExpiry) || "N/A") : (formatDateDisplay(client.passportExpiry || contract.passportExpiry || client.idExpiry) || "N/A")}</div>
          </div>
        </div>
        <div class="grid-2 border-b-black" style="font-size: 6.5px;">
          <div class="border-r-black" style="padding: 2px 4px;">
            <div style="font-size: 6px; color: #6b7280;">NATIONALITY / الجنسية</div>
            <div style="font-weight: bold;">${client.nationality || "N/A"}</div>
          </div>
          <div style="padding: 2px 4px;">
            <div style="font-size: 6px; color: #6b7280;">DATE OF BIRTH / تاريخ الميلاد</div>
            <div style="font-weight: bold;">${formatDateDisplay(client.dateOfBirth || client.dob) || "N/A"}</div>
          </div>
        </div>
        <div class="grid-2 border-b-black" style="font-size: 6.5px;">
          <div class="border-r-black" style="padding: 2px 4px;">
            <div style="font-size: 6px; color: #6b7280;">TEL/MOBILE / الهاتف</div>
            <div style="font-weight: bold;">${client.phone || "N/A"}</div>
          </div>
          <div style="padding: 2px 4px;">
            <div style="font-size: 6px; color: #6b7280;">EMAIL / البريد</div>
            <div style="font-weight: 600; font-size: 6px;">${client.email || "N/A"}</div>
          </div>
        </div>
        <div class="border-b-black" style="padding: 2px 4px; font-size: 6.5px;">
          <div style="font-size: 6px; color: #6b7280;">ADDRESS IN UAE / العنوان في الإمارات</div>
          <div style="font-weight: 500;">${client.address || "N/A"}</div>
        </div>
        <div style="padding: 2px 4px; font-size: 6.5px;">
          <div style="font-size: 6px; color: #6b7280;">PERMANENT ADDRESS / العنوان الدائم</div>
          <div style="font-weight: 500; color: #4b5563;">${client.permanentAddress || client.address || "Same as above"}</div>
        </div>
      </div>

      <!-- VEHICLE & HIRE INFO (Col Span 7) -->
      <div class="col-7" style="display: flex; flex-direction: column;">
        <div class="bg-gray-100 border-b-black" style="padding: 2px 4px; display: flex; justify-content: space-between; font-weight: bold; font-size: 7.5px;">
          <span>VEHICLE &amp; HIRE INFORMATION</span>
          <span style="direction: rtl;">معلومات المركبة والاستئجار</span>
        </div>
        <div class="grid-3 border-b-black" style="font-size: 6.5px;">
          <div class="col-span-2 border-r-black" style="padding: 2px 4px;">
            <div style="font-size: 6px; color: #6b7280;">VEHICLE TYPE / نوع المركبة</div>
            <div style="font-weight: 900; font-size: 8.5px;">${unit.make || ""} ${unit.model || ""}</div>
          </div>
          <div style="padding: 2px 4px;">
            <div style="font-size: 6px; color: #6b7280;">TRAFFIC PLATE NO / رقم اللوحة</div>
            <div style="font-weight: 900; font-size: 9px; color: #dc2626;">${unit.plate || "N/A"}</div>
          </div>
        </div>
        <div class="grid-3 border-b-black" style="font-size: 6.5px;">
          <div class="border-r-black" style="padding: 2px 4px;">
            <div style="font-size: 6px; color: #6b7280;">MODEL / سنة الصنع</div>
            <div style="font-weight: bold;">${unit.year || "N/A"}</div>
          </div>
          <div class="border-r-black" style="padding: 2px 4px;">
            <div style="font-size: 6px; color: #6b7280;">COLOUR / اللون</div>
            <div style="font-weight: bold;">${unit.color || "N/A"}</div>
          </div>
          <div style="padding: 2px 4px;">
            <div style="font-size: 6px; color: #6b7280;">KM PER DAY / كم يومي</div>
            <div style="font-weight: bold;">${contract.dailyKmLimit > 0 ? `${contract.dailyKmLimit} km` : "Unlimited"}</div>
          </div>
        </div>
        <div class="grid-3 border-b-black" style="font-size: 6.5px;">
          <div class="col-span-2 border-r-black" style="padding: 2px 4px;">
            <div style="font-size: 6px; color: #6b7280;">HANDOVER DATE / تاريخ التسليم</div>
            <div style="font-weight: bold;">${handoverDisplay}</div>
          </div>
          <div style="padding: 2px 4px;">
            <div style="font-size: 6px; color: #6b7280;">OUT KM / عداد الخروج</div>
            <div style="font-weight: 900; color: #b45309;">${contract.checkoutMileage ? `${contract.checkoutMileage.toLocaleString()} km` : `${unit.mileage || 0} km`}</div>
          </div>
        </div>
        <div class="grid-3 border-b-black" style="font-size: 6.5px;">
          <div class="col-span-2 border-r-black" style="padding: 2px 4px;">
            <div style="font-size: 6px; color: #6b7280;">RETURN DATE / تاريخ الإرجاع</div>
            <div style="font-weight: bold;">${returnDisplay}</div>
          </div>
          <div style="padding: 2px 4px;">
            <div style="font-size: 6px; color: #6b7280;">IN KM / عداد الإرجاع</div>
            <div style="font-weight: 900;">${returnMileageDisplay}</div>
          </div>
        </div>

        <!-- HIRE RATES -->
        <div class="bg-gray-100 border-b-black" style="padding: 2px 4px; display: flex; justify-content: space-between; font-weight: bold; font-size: 7.5px;">
          <span>${isPersonalized ? "HIRE INFORMATION (PERSONAL USE)" : "HIRE INFORMATION"}</span>
          <span style="direction: rtl;">${isPersonalized ? "معلومات الاستخدام (شخصي ومخصص)" : "معلومات الاستئجار"}</span>
        </div>
        <div class="grid-3 border-b-black" style="font-size: 6.5px;">
          <div class="border-r-black" style="padding: 2px 4px;">
            <div style="font-size: 6px; color: #6b7280;">HIRE RATE 24H (AED) / الإيجار اليومي</div>
            <div style="font-weight: bold;">AED ${isPersonalized ? "0.00" : (contract.dailyRate || 0)}</div>
          </div>
          <div class="border-r-black" style="padding: 2px 4px;">
            <div style="font-size: 6px; color: #6b7280;">DEPOSIT AMOUNT / التأمين</div>
            <div style="font-weight: bold; color: #047857;">AED ${isPersonalized ? "0.00" : (contract.depositAmount || 0)}</div>
          </div>
          <div style="padding: 2px 4px;">
            <div style="font-size: 6px; color: #6b7280;">EXTRA KM / كم زائد</div>
            <div style="font-weight: bold;">AED ${isPersonalized ? "0.00" : (contract.pricePerExtraKm || 0)}</div>
          </div>
        </div>
        <div class="grid-3 border-b-black" style="font-size: 6.5px;">
          <div class="border-r-black" style="padding: 2px 4px;">
            <div style="font-size: 6px; color: #6b7280;">TOTAL CHARGES / الإجمالي</div>
            <div style="font-weight: 900; font-size: 8.5px;">AED ${(Number(contract.totalAmount) || 0).toFixed(2)}</div>
          </div>
          <div class="col-span-2" style="padding: 2px 4px; background: #fef3c7;">
            <div style="font-size: 6px; color: #92400e; font-weight: bold;">BALANCE DUE / المستحق</div>
            <div style="font-weight: 900; font-size: 8.5px; color: #b45309;">AED ${Math.max(0, (Number(contract.totalAmount) || 0) - (Number(contract.advancePayment) || 0)).toFixed(2)}</div>
          </div>
        </div>

        <!-- ADDITIONAL DRIVER -->
        <div class="bg-gray-100 border-b-black" style="padding: 2px 4px; display: flex; justify-content: space-between; font-weight: bold; font-size: 7.5px;">
          <span>ADDITIONAL DRIVER DETAILS</span>
          <span style="direction: rtl;">بيانات السائق الإضافي</span>
        </div>
        <div class="grid-2 border-b-black" style="font-size: 6.5px;">
          <div class="border-r-black" style="padding: 2px 4px;">
            <div style="font-size: 6px; color: #6b7280;">NAME / الاسم</div>
            <div style="font-weight: bold;">${contract.additionalDriverName || "N/A"}</div>
          </div>
          <div style="padding: 2px 4px;">
            <div style="font-size: 6px; color: #6b7280;">LICENSE NO / رقم الرخصة</div>
            <div style="font-weight: bold;">${contract.additionalDriverLicense || "N/A"}</div>
          </div>
        </div>
        <div class="grid-2" style="font-size: 6.5px;">
          <div class="border-r-black" style="padding: 2px 4px;">
            <div style="font-size: 6px; color: #6b7280;">NATIONALITY / الجنسية</div>
            <div style="font-weight: bold;">${contract.additionalDriverNationality || "N/A"}</div>
          </div>
          <div style="padding: 2px 4px;">
            <div style="font-size: 6px; color: #6b7280;">PHONE / الهاتف</div>
            <div style="font-weight: bold;">${contract.additionalDriverPhone || "N/A"}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== TABLE 1: IMPORTANT NOTES FOR CUSTOMER ===== -->
    <div class="border-b-black" style="background: #fff;">
      <div style="display: flex; justify-content: space-between; background: #f3f4f6; border-bottom: 1px solid #000; padding: 2px 6px; font-weight: 900; font-size: 7.5px;">
        <span>IMPORTANT NOTES FOR CUSTOMER:</span>
        <span style="direction: rtl;">معلومات هامة للمستأجر:</span>
      </div>
      <div style="border-bottom: 1px solid #000; padding: 2px 6px; text-align: center;">
        <p style="font-weight: bold; font-size: 6.8px; direction: rtl; color: #030712;">يكون لموظفي شركة ليون لتأجير السيارات ش.ذ.م.م كامل الصلاحية في تمديد فترة إيجار المركبة وزيادة رسومها المتفق عليها مع المستأجر</p>
        <p style="font-size: 6px; color: #374151; margin-top: 1px;">Hirer is obliged to obtain all extensions to this hire agreement from authorized Leon Car Rental LLC staff, All extensions may be subject to rate increases.</p>
      </div>
      <div style="border-bottom: 1px solid #000; padding: 2px 6px; text-align: center;">
        <p style="font-weight: bold; font-size: 6.8px; direction: rtl; color: #030712;">التأمين لا يشمل أي ضرر لزجاج المركبة والإطارات وغطاء الإطارات والزنجات والأعطال الميكانيكية الناتجة عن إهمال المستأجر ويتحمل المستأجر مسؤولية تغطية قيمة الإصلاح أو الإستبدال</p>
        <p style="font-size: 6px; color: #374151; margin-top: 1px;">Insurance does not cover or include any damage to the vehicle Glass, Tires, Tire cover or Alloy wheels, Mechanical malfunctions resulting from the Hirer negligence and the Hirer is responsible for covering the value of repair or replacement.</p>
      </div>
      <div style="border-bottom: 1px solid #000; padding: 2px 6px; text-align: center;">
        <p style="font-weight: bold; font-size: 6.8px; direction: rtl; color: #030712;">أوافق على سداد رسوم عبور بوابات التعرفة المرورية (سالك / درب) وكذلك قيمة كل مخالفة مرورية ارتكبها شاملة الرسوم إن وجدت.</p>
        <p style="font-size: 6px; color: #374151; margin-top: 1px;">I Agree to pay the Traffic Toll Gate charges (SALIK / DARB) &amp; each Traffic Violations &amp; service charge if any.</p>
      </div>
      <div style="border-bottom: 1px solid #000; padding: 2px 6px; text-align: center;">
        <p style="font-weight: bold; font-size: 6.8px; direction: rtl; color: #030712;">فقدان المستأجر لمفتاح المركبة سيعرضه لسداد قيمة مفتاح جديد من وكيل المركبة المعتمد في الدولة فقط وبدون رسوم إضافية.</p>
        <p style="font-size: 6px; color: #374151; margin-top: 1px;">In case the hirer loss the vehicle access key so he/she will pay the fees of get new Key from the vehicle agency that certified in UAE only.</p>
      </div>
      <div style="padding: 2px 6px; text-align: center;">
        <p style="font-weight: bold; font-size: 6.8px; direction: rtl; color: #030712;">🚭 حظر التدخين داخل السيارة المستأجرة إذ كان السائق أو الراكب يدخن داخل السيارة، فهم مسؤولون عن دفع غرامة تتراوح بين 200 درهم إلى 400 درهم. 🚭</p>
        <p style="font-size: 6px; font-weight: 600; color: #111827; margin-top: 1px;">Smoking is prohibited inside the rented vehicle. If the driver or passenger smokes inside the vehicle, they are responsible for paying a fine ranging from AED 200 to AED 400.</p>
      </div>
    </div>

    <!-- ===== TABLE 2: NOTE / TERMS AND CONDITIONS ===== -->
    <div class="border-b-black" style="background: #fff;">
      <div style="display: flex; justify-content: space-between; background: #f3f4f6; border-bottom: 1px solid #000; padding: 2px 6px; font-weight: 900; font-size: 7.5px;">
        <span>Note:</span>
        <span style="direction: rtl;">ملاحظات:</span>
      </div>
      <div style="display: flex; justify-content: space-between; background: #f9fafb; border-bottom: 1px solid #e5e7eb; padding: 2px 6px; font-weight: bold; font-size: 6.5px;">
        <span>Terms and Conditions of Rental <span style="font-weight: normal; color: #6b7280;">(Subject to the laws of the United Arab Emirates)</span></span>
        <span style="direction: rtl;">أحكام وشروط الإيجار <span style="font-weight: normal; color: #6b7280;">(خاضعة لأحكام وقانون دولة الإمارات العربية المتحدة)</span></span>
      </div>
      <div style="font-size: 5.8px; line-height: 1.15; padding: 2px 4px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; border-bottom: 1px solid #f3f4f6; padding: 1.5px 0;">
          <div>• If the vehicle is impounded by government authorities for any violation of the law, I agree to pay the rental charges until the vehicle is returned to Leon Car Rental L.L.C.</div>
          <div style="text-align: right; direction: rtl; font-weight: 600;">• إذا تم حجز المركبة من قبل السلطات الحكومية لأي مخالفة للقانون فإنني أوافق على دفع تكاليف الاستئجار حتى يتم إعادة المركبة إلى شركة ليون لتأجير السيارات ش.ذ.م.م.</div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; border-bottom: 1px solid #f3f4f6; padding: 1.5px 0;">
          <div>• For all customers involved in collision accidents, total loss deductible starts from AED 3,000 + 10% deductible, plus an additional 10% for drivers under 25 years.</div>
          <div style="text-align: right; direction: rtl; font-weight: 600;">• بالنسبة لجميع الزبائن الذين يرتكبون حوادث، في حالة الخسارة الكلية يتم احتساب ابتداءً من 3000 درهم بالإضافة إلى 10% تحمل، وتضاف 10% للسائق تحت 25 سنة.</div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; border-bottom: 1px solid #f3f4f6; padding: 1.5px 0;">
          <div>• A police report is mandatory in all cases.</div>
          <div style="text-align: right; direction: rtl; font-weight: 600;">• تقرير الشرطة إلزامي في كل الأحوال.</div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; border-bottom: 1px solid #f3f4f6; padding: 1.5px 0;">
          <div>• The renter agrees to return the vehicle with the same amount of fuel as it had at the time of rental.</div>
          <div style="text-align: right; direction: rtl; font-weight: 600;">• يوافق المستأجر على إعادة المركبة بنفس كمية الوقود التي كانت في المركبة عند استئجارها.</div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; border-bottom: 1px solid #f3f4f6; padding: 1.5px 0;">
          <div>• The rental period is calculated on a 24-hour basis.</div>
          <div style="text-align: right; direction: rtl; font-weight: 600;">• يتم احتساب مدة التأجير على أساس 24 ساعة.</div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; border-bottom: 1px solid #f3f4f6; padding: 1.5px 0;">
          <div>• In the event of mechanical failures resulting from misuse, the renter shall bear the cost of damages and repairs.</div>
          <div style="text-align: right; direction: rtl; font-weight: 600;">• في حالة الأعطال الميكانيكية الناتجة عن سوء الاستعمال يتحمل المستأجر قيمة الأضرار وإصلاحها.</div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; border-bottom: 1px solid #f3f4f6; padding: 1.5px 0;">
          <div>• By signing below, the renter shall be responsible for the first excess of insurance (10% of compulsory deductible).</div>
          <div style="text-align: right; direction: rtl; font-weight: 600;">• بالتوقيع أدناه بهذه الصفحة يكون المستأجر مسؤولاً عن الزيادة الأولى في التأمين وهي 10% من قيمة التحمل الإجباري.</div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 1.5px 0;">
          <div>• Payment: The renter agrees to pay and settle all charges to Leon Car Rental L.L.C. on or before returning the vehicle.</div>
          <div style="text-align: right; direction: rtl; font-weight: 600;">• السداد: يقبل المستأجر بدون مناقشة أن يدفع ويسدد كافة الرسوم المتعلقة بإيجار المركبة إلى ليون لتأجير السيارات ش.ذ.م.م.</div>
        </div>
      </div>
    </div>

    <!-- INSPECTION PHOTOS (8 ANGLES) -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 4px 0; border-bottom: 1px solid #000;">
      <!-- CHECK OUT -->
      <div style="border: 1px solid #000; padding: 3px; border-radius: 4px; background: #fafafa;">
        <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 2px; margin-bottom: 3px;">
          <span>CHECK OUT (تسليم خروج)</span>
          <span style="color: #b45309;">KM: ${contract.checkoutMileage || unit.mileage || 0} | Fuel: ${contract.checkoutFuelLevel || 100}%</span>
        </div>
        <div class="grid-4" style="gap: 2px;">
          ${INSPECTION_ANGLES.map((angle, idx) => {
            const p = Array.isArray(contract.inspectionPhotos) ? contract.inspectionPhotos[idx] : null;
            if (p && typeof p === "string" && p.trim()) {
              return `<div style="border: 1px solid #d1d5db; height: 38px; overflow: hidden; border-radius: 2px; background: #fff;"><img src="${p}" style="width: 100%; height: 100%; object-fit: cover;" /></div>`;
            }
            return `<div style="border: 1px dashed #d1d5db; height: 38px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 5.5px; color: #9ca3af; text-align: center; border-radius: 2px;"><span>${angle.en}</span><span style="direction: rtl;">${angle.ar}</span></div>`;
          }).join("")}
        </div>
      </div>

      <!-- CHECK IN -->
      <div style="border: 1px solid #000; padding: 3px; border-radius: 4px; background: #fafafa;">
        <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 2px; margin-bottom: 3px;">
          <span>CHECK IN (استلام عودة)</span>
          <span style="color: #047857;">KM: ${returnMileageDisplay || "Pending"} | Fuel: ${contract.returnFuelLevel ? `${contract.returnFuelLevel}%` : "Pending"}</span>
        </div>
        <div class="grid-4" style="gap: 2px;">
          ${INSPECTION_ANGLES.map((angle, idx) => {
            const p = Array.isArray(contract.returnPhotos) ? contract.returnPhotos[idx] : null;
            if (p && typeof p === "string" && p.trim()) {
              return `<div style="border: 1px solid #d1d5db; height: 38px; overflow: hidden; border-radius: 2px; background: #fff;"><img src="${p}" style="width: 100%; height: 100%; object-fit: cover;" /></div>`;
            }
            return `<div style="border: 1px dashed #d1d5db; height: 38px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 5.5px; color: #9ca3af; text-align: center; border-radius: 2px;"><span>${angle.en}</span><span style="direction: rtl;">${angle.ar}</span></div>`;
          }).join("")}
        </div>
      </div>
    </div>

    <!-- ACKNOWLEDGMENT LINE -->
    <div style="display: flex; justify-content: space-between; font-size: 5.8px; color: #4b5563; padding: 2px 2px; border-bottom: 1px solid #e5e7eb;">
      <span>By signing below, the hirer acknowledges vehicle condition inspection, verification of fuel and odometer, and agrees to all terms and conditions of this contract.</span>
      <span style="direction: rtl;">بالتوقيع أدناه، يقر المستأجر بمعاينة حالة المركبة والتحقق من الوقود ومستوى العداد ويوافق على كافة الشروط والأحكام.</span>
    </div>

    <!-- SIGNATURES -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 6px 10px 2px; align-items: center;">
      <!-- STAFF SIGN -->
      <div style="display: flex; align-items: center; gap: 6px;">
        <strong style="font-size: 8.5px;">Staff Sign:</strong>
        <div style="flex: 1; height: 36px; border-bottom: 1px dashed #9ca3af; position: relative; display: flex; align-items: center; justify-content: center;">
          ${adminSignBase64 ? `<img src="${adminSignBase64}" style="max-height: 34px; max-width: 80%; object-fit: contain;" />` : ''}
        </div>
        <strong style="font-size: 8.5px; direction: rtl;">توقيع الموظف:</strong>
      </div>

      <!-- HIRER SIGN -->
      <div style="display: flex; align-items: center; gap: 6px;">
        <strong style="font-size: 8.5px;">Hirer Sign:</strong>
        <div style="flex: 1; height: 36px; border-bottom: 1px dashed #9ca3af; position: relative; display: flex; align-items: center; justify-content: center;">
          ${contract.customerSignature ? `<img src="${contract.customerSignature}" style="max-height: 34px; max-width: 80%; object-fit: contain;" />` : `<span style="font-size: 7px; color: #9ca3af;">Customer Signature</span>`}
        </div>
        <strong style="font-size: 8.5px; direction: rtl;">توقيع المستأجر:</strong>
      </div>
    </div>
  </div>

  <!-- PAGE BREAK -->
  <div class="page-break" style="height: 0; margin: 0;"></div>

  <!-- PAGE 2: TERMS AND CONDITIONS -->
  <div style="border: 1.5px solid #000; padding: 8px 10px; background: #fff; position: relative; margin-top: 10px;">
    <div style="height: 4px; background: #EEA21B; margin: -8px -10px 6px;"></div>
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #000; padding-bottom: 3px; margin-bottom: 4px;">
      <span style="font-size: 9.5px; font-weight: 900; text-decoration: underline;">Terms &amp; Conditions:-</span>
      <span style="font-size: 10px; font-weight: 900; text-decoration: underline; direction: rtl;">الشروط والأحكام:-</span>
    </div>

    <div style="display: flex; flex-direction: column; gap: 1px; font-size: 5.6px; line-height: 1.12;">
      ${CONTRACT_TERMS.map((t) => `
        <div class="term-row">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; align-items: start;">
            <div style="text-align: left;">
              <strong>${t.num}- </strong><span>${t.en}</span>
            </div>
            <div style="text-align: right; direction: rtl;">
              <span dir="ltr"><strong>${t.num}- </strong></span><span>${t.ar}</span>
            </div>
          </div>
          ${t.subItems && t.subItems.length > 0 ? `
            <div style="margin-top: 1px;">
              ${t.subItems.map(sub => `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 1px 0;">
                  <div style="padding-left: 8px;"><strong>${sub.enKey} </strong>${sub.en}</div>
                  <div style="padding-right: 8px; text-align: right; direction: rtl;"><strong>${sub.arKey} </strong>${sub.ar}</div>
                </div>
              `).join("")}
            </div>
          ` : ""}
        </div>
      `).join("")}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generates the EXACT official contract PDF matching the Admin Print page (/bookings/[id]/print)
 * 1. Tries to load the real live print URL via Puppeteer (exact live React component).
 * 2. If server loopback is unreachable, falls back to the exact high-fidelity template.
 */
export async function generateContractPdfFromPrintUrl(
  contractId: string,
  fallbackData?: ContractPdfData
): Promise<Buffer> {
  const execPath = getBrowserExecutablePath();
  if (!execPath) {
    console.error("[PdfGenerator] No Chrome or Edge executable found on server host");
    throw new Error("No browser executable found to render print PDF");
  }

  // 1. Fetch full contract data from database
  let contractObj: any = null;
  try {
    await connectDB();
    const mongoose = (await import("mongoose")).default;
    if (mongoose.Types.ObjectId.isValid(contractId)) {
      contractObj = await Contract.findById(contractId)
        .populate({ path: "clientId" })
        .populate({ path: "unitId" })
        .lean();
    }
    if (!contractObj && !isNaN(Number(contractId))) {
      contractObj = await Contract.findOne({ contractNumber: Number(contractId) })
        .populate({ path: "clientId" })
        .populate({ path: "unitId" })
        .lean();
    }
    if (contractObj) {
      if (contractObj.clientId) {
        const cId = typeof contractObj.clientId === "object" ? (contractObj.clientId._id || contractObj.clientId.id) : contractObj.clientId;
        if (cId && mongoose.Types.ObjectId.isValid(cId)) {
          const freshClient = await Client.findById(cId).lean();
          if (freshClient) contractObj.clientId = freshClient;
        }
      }
      if (contractObj.unitId) {
        const uId = typeof contractObj.unitId === "object" ? (contractObj.unitId._id || contractObj.unitId.id) : contractObj.unitId;
        if (uId && mongoose.Types.ObjectId.isValid(uId)) {
          const freshUnit = await Unit.findById(uId).lean();
          if (freshUnit) contractObj.unitId = freshUnit;
        }
      }
    }
  } catch (dbErr) {
    console.warn(`[PdfGenerator] Failed loading contract from DB for ${contractId}:`, dbErr);
  }

  // If not found in DB, adapt fallbackData
  if (!contractObj && fallbackData) {
    contractObj = {
      ...fallbackData,
      clientId: {
        name: fallbackData.clientName,
        phone: fallbackData.clientPhone,
        email: fallbackData.clientEmail,
        idNumber: fallbackData.clientIdNumber,
        licenseNumber: fallbackData.clientLicense,
        licenseIssuedBy: fallbackData.licenseIssuedBy,
        licenseIssuedDate: fallbackData.licenseIssuedDate,
        licenseExpiry: fallbackData.licenseExpiry,
        passportNumber: fallbackData.passportNumber,
        passportExpiry: fallbackData.passportExpiry,
        nationality: fallbackData.nationality,
      },
      unitId: {
        make: fallbackData.vehicleName?.split(" ")[0] || "Vehicle",
        model: fallbackData.vehicleName?.split(" ").slice(1).join(" ") || "",
        plate: fallbackData.vehiclePlate,
        color: fallbackData.vehicleColor,
        year: fallbackData.vehicleYear,
      },
    };
  }

  // Share ONE render between concurrent callers (client email + admin email fire together on handover)
  const updatedStamp = contractObj?.updatedAt ? new Date(contractObj.updatedAt).getTime() : "";
  const clientUpdatedStamp = contractObj?.clientId?.updatedAt ? new Date(contractObj.clientId.updatedAt).getTime() : "";
  const unitUpdatedStamp = contractObj?.unitId?.updatedAt ? new Date(contractObj.unitId.updatedAt).getTime() : "";
  const cacheKey = `${contractId}:${updatedStamp}:${clientUpdatedStamp}:${unitUpdatedStamp}`;
  const existingJob = pdfJobs.get(cacheKey);
  if (existingJob) {
    console.log(`[PdfGenerator] Reusing in-flight/recent PDF render for ${cacheKey}`);
    return existingJob;
  }

  const job = renderPrintPagePdf(contractId, execPath);
  pdfJobs.set(cacheKey, job);
  job.then(
    () => { setTimeout(() => pdfJobs.delete(cacheKey), 20000); },
    () => { pdfJobs.delete(cacheKey); }
  );
  return job;
}

const pdfJobs = new Map<string, Promise<Buffer>>();

export function clearPdfJobs(contractId?: string) {
  if (contractId) {
    for (const key of Array.from(pdfJobs.keys())) {
      if (key.startsWith(`${contractId}:`)) {
        pdfJobs.delete(key);
      }
    }
  } else {
    pdfJobs.clear();
  }
}

/**
 * Renders the REAL /bookings/[id]/print page with Puppeteer and prints it to PDF.
 * Never uses a different template: if the page cannot be loaded it retries, then throws.
 */
async function renderPrintPagePdf(contractId: string, execPath: string): Promise<Buffer> {
  const localPort = process.env.PORT || "3000";
  const idPath = encodeURIComponent(contractId);
  const query = "noprint=1&fresh=1";
  const candidateUrls = Array.from(
    new Set(
      [
        `http://localhost:${localPort}/bookings/${idPath}/print?${query}`,
        `http://127.0.0.1:${localPort}/bookings/${idPath}/print?${query}`,
        process.env.NEXTAUTH_URL ? `${process.env.NEXTAUTH_URL.replace(/\/$/, "")}/bookings/${idPath}/print?${query}` : null,
        localPort !== "3000" ? `http://localhost:3000/bookings/${idPath}/print?${query}` : null,
      ].filter(Boolean) as string[]
    )
  );

  let browser: any = null;
  let page: any = null;
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

    page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });

    let loaded = false;
    let lastError: any = null;
    for (let attempt = 1; attempt <= 2 && !loaded; attempt++) {
      for (const printUrl of candidateUrls) {
        try {
          console.log(`[PdfGenerator] (attempt ${attempt}) Rendering real print page: ${printUrl}`);
          await page.goto(printUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
          // Only appears after the contract data has been loaded and rendered by the real page
          await page.waitForSelector("#contract-page-1", { timeout: 30000 });

          // Wait for every image (logo, signatures, inspection photos) to finish loading
          await page.evaluate(async () => {
            const imgs = Array.from(document.images);
            await Promise.all(
              imgs.map((img) =>
                img.complete
                  ? Promise.resolve()
                  : new Promise<void>((resolve) => {
                      img.onload = () => resolve();
                      img.onerror = () => resolve();
                      setTimeout(() => resolve(), 10000);
                    })
              )
            );
          });

          loaded = true;
          console.log(`[PdfGenerator] Real print page loaded from ${printUrl}`);
          break;
        } catch (err: any) {
          lastError = err;
          console.warn(`[PdfGenerator] Could not load ${printUrl}: ${err?.message || err}`);
        }
      }
    }

    if (!loaded) {
      throw new Error(`Could not render the real print page for contract ${contractId}: ${lastError?.message || "unreachable"}`);
    }

    // Wait for fonts to settle
    try {
      await page.evaluate(() => (document as any).fonts?.ready);
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));

    const pdfUint8Array = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "6mm", bottom: "6mm", left: "5mm", right: "5mm" },
    });

    const pdfBuffer = Buffer.from(pdfUint8Array);
    console.log(`[PdfGenerator] Successfully generated official real contract PDF (${pdfBuffer.length} bytes) for #${contractId}`);
    return pdfBuffer;
  } catch (err) {
    console.error(`[PdfGenerator] Failed generating official contract PDF for ${contractId}:`, err);
    throw err;
  } finally {
    if (page) {
      try { await page.close(); } catch {}
    }
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }
}

/**
 * Backward compatibility: generates the REAL official PDF contract buffer (NOT fake PDFKit!)
 */
export async function generateContractPdf(data: ContractPdfData): Promise<Buffer> {
  const dummyId = String(data.contractNumber || Date.now());
  return generateContractPdfFromPrintUrl(dummyId, data);
}
