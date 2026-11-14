import connectDB from "@/lib/db";
import { Client } from "@/models/Client";
import { hasEmiratesIdNumber, isUaeLicenseAuthority } from "@/lib/client-utils";
import { invalidateBackendContextCache } from "@/lib/assistant-backend";
import { DocumentOcrError, ScannedDocumentData, scanDocumentImages } from "@/lib/document-ocr";
import { saveImageToUploads } from "@/lib/server-upload";

export interface AiClientAssistantResponse {
  reply: string;
  action:
    | "NAVIGATE"
    | "CREATE_CONTRACT"
    | "CLIENT_CREATED"
    | "OPEN_ADD_CLIENT_MODAL"
    | "OPEN_ADD_COMPANY_MODAL"
    | "OPEN_ADD_UNIT_MODAL"
    | "UI_CLICK"
    | "SEARCH_RESULT"
    | "OVERVIEW"
    | "NONE";
  navigateUrl?: string;
  data?: {
    type?: "clients" | "vehicles" | "contracts" | "overview";
    items?: any[];
    stats?: Record<string, any>;
  };
}

export interface ContactHints {
  phone?: string;
  email?: string;
  nameOverride?: string;
  clientTypeOverride?: "Resident" | "Tourist";
  scanOnly: boolean;
  wantsContract: boolean;
}

export interface ScannerDependencies {
  connectDB?: () => Promise<any>;
  scanDocumentImages?: (images: string[]) => Promise<{ data: ScannedDocumentData }>;
  saveImageToUploads?: (image: string, folder?: string) => Promise<{ url: string; secure_url: string }>;
  ClientModel?: any;
  invalidateBackendContextCache?: () => void;
}

const DEFAULT_DEPS: Required<ScannerDependencies> = {
  connectDB,
  scanDocumentImages,
  saveImageToUploads,
  ClientModel: Client,
  invalidateBackendContextCache,
};

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toAsciiDigits(input: string): string {
  return input
    .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1632 + 48))
    .replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1776 + 48));
}

export function formatEmiratesId(rawId: string): string {
  const digits = toAsciiDigits(rawId).replace(/\D/g, "");
  if (digits.length === 15 && digits.startsWith("784")) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 14)}-${digits.slice(14, 15)}`;
  }
  return rawId.trim();
}

function isGenuineIdentifier(val?: string | null): boolean {
  if (!val) return false;
  const trimmed = String(val).trim();
  if (trimmed.length < 4) return false;
  if (/^n\/?a$/i.test(trimmed)) return false;
  if (/^[RTB]-\d{4,}$/i.test(trimmed) || /^B2B-/i.test(trimmed)) return false;
  return true;
}

function normalizeDateOrNull(isoDate?: string | null): Date | null {
  if (!isoDate || !String(isoDate).trim()) return null;
  const parsed = new Date(String(isoDate).trim());
  return isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateDisplay(val?: string | Date | null): string {
  if (!val) return "";
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? "" : val.toISOString().split("T")[0];
  }
  const str = String(val).trim();
  if (!str) return "";
  const match = str.match(/^\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? str : parsed.toISOString().split("T")[0];
}

export function extractContactHintsFromMessage(message: string): ContactHints {
  const raw = toAsciiDigits(message || "").trim();

  // Extract email
  const emailMatch = raw.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
  const email = emailMatch ? emailMatch[0].trim() : undefined;

  // Mask dates and Emirates IDs before scanning for phone numbers
  const maskedForPhone = raw
    .replace(emailMatch?.[0] || "", " ")
    .replace(/\b784[-\s]?\d{4}[-\s]?\d{7}[-\s]?\d\b/g, " ")
    .replace(/\b\d{1,4}\s*[-/.]\s*\d{1,2}\s*[-/.]\s*\d{1,4}\b/g, " ");

  const phoneMatch = maskedForPhone.match(
    /(?:^|[\s:;,])((?:\+|00)\d[\d\s\-()]{6,16}\d|05\d[\d\s\-]{7,9}|0[1-9]\d[\d\s\-]{6,10}|5\d[\d\s\-]{7,8})(?=$|[\s.,;])/
  );
  let phone: string | undefined;
  if (phoneMatch && phoneMatch[1]) {
    const cleaned = phoneMatch[1].replace(/[()]/g, "").replace(/\s+/g, " ").trim();
    const digitsOnly = cleaned.replace(/\D/g, "");
    if (digitsOnly.length >= 8 && digitsOnly.length <= 15) {
      phone = cleaned;
    }
  }

  let clientTypeOverride: "Resident" | "Tourist" | undefined;
  if (/\btourist\b|سائح|سايح|زائر/i.test(raw)) {
    clientTypeOverride = "Tourist";
  } else if (/\bresident\b|مقيم|مواطن/i.test(raw)) {
    clientTypeOverride = "Resident";
  }

  const scanOnly =
    /\b(only\s*scan|just\s*scan|scan\s*only|read\s*only|don'?t\s*create|do\s*not\s*create|extract\s*only|preview\s*only)\b|فقط\s*(?:اقرأ|استخرج|فحص)|بدون\s*(?:إنشاء|انشاء|حفظ|إضافة|اضافة)/i.test(
      raw
    );

  const wantsContract =
    /\b(contract|book|booking|rent|rental|create\s+contract)\b|عقد|حجز|استئجار|أجر|اجر/i.test(
      raw
    );

  let nameOverride: string | undefined;
  const nameMatch = raw.match(
    /(?:^|[\n,;])\s*(?:name|client\s*name|الاسم|اسم\s*العميل)\s*[:\-]\s*([^\n,;]+)/i
  );
  if (nameMatch && nameMatch[1]) {
    const candidate = nameMatch[1]
      .replace(/\b(?:phone|email|tel|mobile|رقم|هاتف|ايميل)\b.*$/i, "")
      .trim();
    if (candidate.length >= 2) {
      nameOverride = candidate;
    }
  }

  return {
    phone,
    email,
    nameOverride,
    clientTypeOverride,
    scanOnly,
    wantsContract,
  };
}

function buildClientCard(client: any) {
  return {
    id: String(client._id || client.id),
    name: client.name,
    phone: client.phone || "N/A",
    clientType: client.clientType,
    nationality: client.nationality,
    idNumber: client.idNumber,
    licenseNumber: client.licenseNumber,
    documentsCount: Array.isArray(client.documents) ? client.documents.length : 0,
  };
}

function formatClientSummaryReply(params: {
  lang: string;
  mode: "created" | "updated" | "scan_only";
  data: {
    name: string;
    clientType: "Resident" | "Tourist";
    nationality?: string;
    idNumber?: string;
    idExpiry?: string;
    passportNumber?: string;
    passportExpiry?: string;
    licenseNumber?: string;
    licenseIssuedBy?: string;
    licenseExpiry?: string;
    internationalLicenseNumber?: string;
    internationalLicenseExpiry?: string;
    phone?: string;
    email?: string;
    documentsCount: number;
  };
  updatedFields?: string[];
}): string {
  const { lang, mode, data, updatedFields = [] } = params;
  const isAr = lang === "ar";

  const header =
    mode === "created"
      ? isAr
        ? "✅ تم فحص المستندات وإنشاء العميل بنجاح:"
        : "✅ Documents scanned and client created successfully:"
      : mode === "updated"
      ? isAr
        ? "ℹ️ العميل مسجل مسبقاً — تم تحديث بياناته وإرفاق المستندات الجديدة:"
        : "ℹ️ Client already exists — updated profile and attached the new documents:"
      : isAr
      ? "📄 بيانات العميل المستخرجة من المستندات:"
      : "📄 Extracted Document Details:";

  const lines: string[] = [header, ""];
  const typeLabel =
    data.clientType === "Tourist"
      ? isAr
        ? "سائح (Tourist)"
        : "Tourist"
      : isAr
      ? "مقيم (Resident)"
      : "Resident";

  lines.push(isAr ? `• **الاسم:** ${data.name}` : `• **Name:** ${data.name}`);
  lines.push(isAr ? `• **الفئة:** ${typeLabel}` : `• **Type:** ${typeLabel}`);

  if (data.nationality) {
    lines.push(
      isAr ? `• **الجنسية:** ${data.nationality}` : `• **Nationality:** ${data.nationality}`
    );
  }

  if (data.idNumber && isGenuineIdentifier(data.idNumber) && data.idNumber !== data.passportNumber) {
    const expStr = data.idExpiry
      ? isAr
        ? ` (ينتهي: ${data.idExpiry})`
        : ` (Exp: ${data.idExpiry})`
      : "";
    lines.push(
      isAr
        ? `• **رقم الهوية:** ${data.idNumber}${expStr}`
        : `• **ID Number:** ${data.idNumber}${expStr}`
    );
  }

  if (data.passportNumber && isGenuineIdentifier(data.passportNumber)) {
    const expStr = data.passportExpiry
      ? isAr
        ? ` (ينتهي: ${data.passportExpiry})`
        : ` (Exp: ${data.passportExpiry})`
      : "";
    lines.push(
      isAr
        ? `• **رقم الجواز:** ${data.passportNumber}${expStr}`
        : `• **Passport No:** ${data.passportNumber}${expStr}`
    );
  }

  if (data.licenseNumber && !/^n\/?a$/i.test(data.licenseNumber)) {
    const byStr = data.licenseIssuedBy ? ` • ${data.licenseIssuedBy}` : "";
    const expStr = data.licenseExpiry
      ? isAr
        ? ` (تنتهي: ${data.licenseExpiry})`
        : ` (Exp: ${data.licenseExpiry})`
      : "";
    lines.push(
      isAr
        ? `• **رخصة القيادة:** ${data.licenseNumber}${byStr}${expStr}`
        : `• **Driving License:** ${data.licenseNumber}${byStr}${expStr}`
    );
  }

  if (data.internationalLicenseNumber) {
    const expStr = data.internationalLicenseExpiry
      ? isAr
        ? ` (تنتهي: ${data.internationalLicenseExpiry})`
        : ` (Exp: ${data.internationalLicenseExpiry})`
      : "";
    lines.push(
      isAr
        ? `• **الرخصة الدولية:** ${data.internationalLicenseNumber}${expStr}`
        : `• **Intl License:** ${data.internationalLicenseNumber}${expStr}`
    );
  }

  if (data.phone && !/^n\/?a$/i.test(data.phone)) {
    lines.push(isAr ? `• **الهاتف:** ${data.phone}` : `• **Phone:** ${data.phone}`);
  } else if (mode !== "scan_only") {
    lines.push(
      isAr
        ? "• **الهاتف:** غير متوفر في المستند (أرسل رقم الهاتف الآن لإضافته فوراً)"
        : "• **Phone:** Not shown on document (reply with phone number to add it)"
    );
  }

  if (data.email) {
    lines.push(isAr ? `• **البريد:** ${data.email}` : `• **Email:** ${data.email}`);
  }

  if (mode !== "scan_only" && data.documentsCount > 0) {
    lines.push(
      isAr
        ? `• **المرفقات المحفوظة:** ${data.documentsCount} وثيقة`
        : `• **Saved Documents:** ${data.documentsCount} file(s)`
    );
  }

  if (mode === "updated" && updatedFields.length > 0) {
    lines.push(
      isAr
        ? `• **التحديثات المضافة:** ${updatedFields.join("، ")}`
        : `• **Updated Fields:** ${updatedFields.join(", ")}`
    );
  }

  return lines.join("\n");
}

function isDrivingLicenseExpired(params: {
  clientType: "Resident" | "Tourist";
  licenseExpiry?: string;
  internationalLicenseNumber?: string;
  internationalLicenseExpiry?: string;
}): boolean {
  const { clientType, licenseExpiry, internationalLicenseNumber, internationalLicenseExpiry } =
    params;
  if (!licenseExpiry) return false;
  const expDate = normalizeDateOrNull(licenseExpiry);
  if (!expDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const hasValidIntlLicense =
    clientType === "Tourist" &&
    Boolean(internationalLicenseNumber) &&
    (!internationalLicenseExpiry ||
      (normalizeDateOrNull(internationalLicenseExpiry)?.getTime() ?? 0) >= today.getTime());

  return expDate < today && !hasValidIntlLicense;
}

export async function handleAiClientDocumentUpload(params: {
  images: string[];
  message: string;
  lang: string;
  deps?: ScannerDependencies;
}): Promise<{
  response: AiClientAssistantResponse;
  client?: any;
  wantsContract: boolean;
}> {
  const { images, message, lang, deps = {} } = params;
  const resolvedDeps: Required<ScannerDependencies> = { ...DEFAULT_DEPS, ...deps };
  const isAr = lang === "ar";
  const hints = extractContactHintsFromMessage(message);

  // 1. Run Vision OCR across all uploaded document images
  let ocr: ScannedDocumentData;
  try {
    const scanRes = await resolvedDeps.scanDocumentImages(images);
    ocr = scanRes.data;
  } catch (err: any) {
    const rawMsg = err instanceof DocumentOcrError ? err.message : err?.message || "";
    return {
      wantsContract: false,
      response: {
        reply: isAr
          ? `❌ تعذر قراءة المستند من الصورة: ${rawMsg || "يرجى إرسال صورة أوضح لبطاقة الهوية أو الجواز أو الرخصة."}`
          : `❌ Could not extract document data from the uploaded image(s): ${rawMsg || "Please upload clearer photos of the ID, Passport, or Driving License."}`,
        action: "NONE",
      },
    };
  }

  const resolvedName = (hints.nameOverride || ocr.name || "").trim();
  const formattedRawId = ocr.idNumber ? formatEmiratesId(ocr.idNumber) : "";
  const formattedPassport = ocr.passportNumber ? ocr.passportNumber.trim() : "";
  const hasUsefulIdentity = Boolean(
    resolvedName ||
      isGenuineIdentifier(formattedRawId) ||
      isGenuineIdentifier(formattedPassport) ||
      isGenuineIdentifier(ocr.licenseNumber) ||
      isGenuineIdentifier(ocr.internationalLicenseNumber)
  );

  if (!hasUsefulIdentity) {
    return {
      wantsContract: false,
      response: {
        reply: isAr
          ? "❌ لم أتمكن من التعرف على بيانات عميل صالحة في الصورة. يرجى رفع صورة واضحة لبطاقة الهوية أو جواز السفر أو رخصة القيادة."
          : "❌ No readable client identity details were found in the uploaded image(s). Please upload a clear Emirates ID, Passport, or Driving License.",
        action: "NONE",
      },
    };
  }

  // Determine Resident vs Tourist following exact CreateClientModal classification rules
  const isResidentDetected =
    hasEmiratesIdNumber(formattedRawId) || isUaeLicenseAuthority(ocr.licenseIssuedBy);
  const effectiveClientType: "Resident" | "Tourist" = isResidentDetected
    ? "Resident"
    : hints.clientTypeOverride || ocr.suggestedClientType || "Resident";

  const finalIdNumber =
    effectiveClientType === "Tourist"
      ? formattedPassport || formattedRawId || `T-${Date.now().toString().slice(-6)}`
      : formattedRawId || `R-${Date.now().toString().slice(-6)}`;

  const finalPassportNumber =
    effectiveClientType === "Tourist"
      ? hasEmiratesIdNumber(finalIdNumber)
        ? ""
        : formattedPassport || finalIdNumber
      : hasEmiratesIdNumber(formattedPassport)
      ? ""
      : formattedPassport;

  const finalLicenseNumber =
    (ocr.licenseNumber || "").trim() || (ocr.internationalLicenseNumber || "").trim() || "N/A";

  const finalPhone = (hints.phone || ocr.phone || "").trim() || "N/A";
  const finalEmail = (hints.email || ocr.email || "").trim();
  const finalNationality =
    (ocr.nationality || "").trim() ||
    (effectiveClientType === "Tourist" ? "International" : "Emirati");
  const finalAddress =
    (ocr.address || "").trim() ||
    (effectiveClientType === "Tourist" ? "Hotel / Tourist stay" : "Local residence");

  // Validate license expiry
  if (
    isDrivingLicenseExpired({
      clientType: effectiveClientType,
      licenseExpiry: ocr.licenseExpiry,
      internationalLicenseNumber: ocr.internationalLicenseNumber,
      internationalLicenseExpiry: ocr.internationalLicenseExpiry,
    })
  ) {
    const labelName = resolvedName || finalIdNumber;
    return {
      wantsContract: false,
      response: {
        reply: isAr
          ? `⚠️ رخصة القيادة الخاصة بالعميل (${labelName}) منتهية الصلاحية بتاريخ **${ocr.licenseExpiry}**. لا يمكن تسجيل عميل برخصة قيادة منتهية إلا بوجود رخصة دولية سارية للسائح.`
          : `⚠️ Driving license for **${labelName}** expired on **${ocr.licenseExpiry}**. Cannot create client with an expired driving license (unless Tourist holds a valid International Driving Permit).`,
        action: "NONE",
      },
    };
  }

  // Scan-only preview mode (user explicitly asked NOT to save)
  if (hints.scanOnly) {
    return {
      wantsContract: false,
      response: {
        reply: formatClientSummaryReply({
          lang,
          mode: "scan_only",
          data: {
            name: resolvedName || finalIdNumber,
            clientType: effectiveClientType,
            nationality: finalNationality,
            idNumber: finalIdNumber,
            idExpiry: ocr.idExpiry,
            passportNumber: finalPassportNumber,
            passportExpiry: ocr.passportExpiry,
            licenseNumber: finalLicenseNumber,
            licenseIssuedBy: ocr.licenseIssuedBy,
            licenseExpiry: ocr.licenseExpiry,
            internationalLicenseNumber: ocr.internationalLicenseNumber,
            internationalLicenseExpiry: ocr.internationalLicenseExpiry,
            phone: finalPhone,
            email: finalEmail,
            documentsCount: images.length,
          },
        }),
        action: "NONE",
      },
    };
  }

  if (!resolvedName) {
    return {
      wantsContract: false,
      response: {
        reply: isAr
          ? "⚠️ تم قراءة رقم الوثيقة ولكن اسم العميل غير واضح في الصورة (قد تكون الجهة الخلفية فقط). يرجى إرفاق الوجه الأمامي للوثيقة أو كتابة اسم العميل مثل: `الاسم: ...` مع الصورة."
          : "⚠️ Document numbers were extracted, but the client's full name was not visible (this may be the back side only). Please attach the front photo too or include `Name: ...` with your message.",
        action: "NONE",
      },
    };
  }

  // 2. Connect DB & Check for Existing Duplicate Client
  await resolvedDeps.connectDB();

  const orConditions: any[] = [];
  if (isGenuineIdentifier(formattedRawId)) {
    const idCandidates = [formattedRawId];
    const compactId = toAsciiDigits(formattedRawId).replace(/[-\s]/g, "");
    if (compactId && compactId !== formattedRawId) {
      idCandidates.push(compactId);
    }
    for (const candidate of idCandidates) {
      const rx = new RegExp(`^${escapeRegex(candidate)}$`, "i");
      orConditions.push({ idNumber: rx }, { passportNumber: rx });
    }
  }
  if (isGenuineIdentifier(formattedPassport)) {
    const rx = new RegExp(`^${escapeRegex(formattedPassport)}$`, "i");
    orConditions.push({ passportNumber: rx }, { idNumber: rx });
  }
  if (isGenuineIdentifier(finalLicenseNumber)) {
    const rx = new RegExp(`^${escapeRegex(finalLicenseNumber)}$`, "i");
    orConditions.push({ licenseNumber: rx });
  }

  const existingClient =
    orConditions.length > 0 ? await resolvedDeps.ClientModel.findOne({ $or: orConditions }) : null;

  // 3. Persist uploaded images cleanly to /uploads/client-documents
  const uploadResults = await Promise.all(
    images.map((img) => resolvedDeps.saveImageToUploads(img, "client-documents"))
  );
  const uploadedUrls = uploadResults.map((u) => u.url).filter(Boolean);

  if (existingClient) {
    const updatedFields: string[] = [];

    const existingDocs = Array.isArray(existingClient.documents) ? existingClient.documents : [];
    const mergedDocs = Array.from(new Set([...existingDocs, ...uploadedUrls]));
    if (mergedDocs.length > existingDocs.length) {
      existingClient.documents = mergedDocs;
      updatedFields.push(isAr ? "المستندات" : "Documents");
    }

    if (hints.phone && (!existingClient.phone || existingClient.phone === "N/A")) {
      existingClient.phone = hints.phone;
      updatedFields.push(isAr ? "الهاتف" : "Phone");
    } else if (
      ocr.phone &&
      (!existingClient.phone || existingClient.phone === "N/A")
    ) {
      existingClient.phone = ocr.phone;
      updatedFields.push(isAr ? "الهاتف" : "Phone");
    }

    if (hints.email && !existingClient.email) {
      existingClient.email = hints.email;
      updatedFields.push(isAr ? "البريد" : "Email");
    } else if (ocr.email && !existingClient.email) {
      existingClient.email = ocr.email;
      updatedFields.push(isAr ? "البريد" : "Email");
    }

    if (
      isGenuineIdentifier(finalLicenseNumber) &&
      (!existingClient.licenseNumber || existingClient.licenseNumber === "N/A")
    ) {
      existingClient.licenseNumber = finalLicenseNumber;
      updatedFields.push(isAr ? "رخصة القيادة" : "Driving License");
    }
    if (ocr.licenseIssuedBy && !existingClient.licenseIssuedBy) {
      existingClient.licenseIssuedBy = ocr.licenseIssuedBy;
    }
    if (ocr.licenseIssuedDate && !existingClient.licenseIssuedDate) {
      existingClient.licenseIssuedDate = normalizeDateOrNull(ocr.licenseIssuedDate);
    }
    if (ocr.licenseExpiry && !existingClient.licenseExpiry) {
      existingClient.licenseExpiry = normalizeDateOrNull(ocr.licenseExpiry);
    }

    if (finalPassportNumber && !existingClient.passportNumber) {
      existingClient.passportNumber = finalPassportNumber;
      updatedFields.push(isAr ? "جواز السفر" : "Passport");
    }
    if (ocr.passportIssuedBy && !existingClient.passportIssuedBy) {
      existingClient.passportIssuedBy = ocr.passportIssuedBy;
    }
    if (ocr.passportIssuedDate && !existingClient.passportIssuedDate) {
      existingClient.passportIssuedDate = normalizeDateOrNull(ocr.passportIssuedDate);
    }
    if (ocr.passportExpiry && !existingClient.passportExpiry) {
      existingClient.passportExpiry = normalizeDateOrNull(ocr.passportExpiry);
    }

    if (
      hasEmiratesIdNumber(formattedRawId) &&
      (!existingClient.idNumber ||
        !hasEmiratesIdNumber(existingClient.idNumber))
    ) {
      existingClient.idNumber = formattedRawId;
      existingClient.clientType = "Resident";
      updatedFields.push(isAr ? "الهوية الإماراتية" : "Emirates ID");
    }
    if (ocr.idIssuedBy && !existingClient.idIssuedBy) {
      existingClient.idIssuedBy = ocr.idIssuedBy;
    }
    if (ocr.idIssuedDate && !existingClient.idIssuedDate) {
      existingClient.idIssuedDate = normalizeDateOrNull(ocr.idIssuedDate);
    }
    if (ocr.idExpiry && !existingClient.idExpiry) {
      existingClient.idExpiry = normalizeDateOrNull(ocr.idExpiry);
    }

    if (ocr.dateOfBirth && !existingClient.dateOfBirth) {
      existingClient.dateOfBirth = normalizeDateOrNull(ocr.dateOfBirth);
    }
    if (ocr.nationality && (!existingClient.nationality || existingClient.nationality === "UAE")) {
      existingClient.nationality = ocr.nationality;
    }
    if (ocr.gender && !existingClient.gender) {
      existingClient.gender = ocr.gender;
    }

    if (ocr.internationalLicenseNumber && !existingClient.internationalLicenseNumber) {
      existingClient.internationalLicenseNumber = ocr.internationalLicenseNumber;
      updatedFields.push(isAr ? "الرخصة الدولية" : "Intl License");
    }
    if (ocr.internationalLicenseExpiry && !existingClient.internationalLicenseExpiry) {
      existingClient.internationalLicenseExpiry = normalizeDateOrNull(
        ocr.internationalLicenseExpiry
      );
    }

    if (updatedFields.length > 0 && typeof existingClient.save === "function") {
      await existingClient.save();
      resolvedDeps.invalidateBackendContextCache();
    }

    const plainExisting = existingClient.toObject
      ? existingClient.toObject()
      : existingClient;

    return {
      wantsContract: hints.wantsContract,
      client: plainExisting,
      response: {
        reply: formatClientSummaryReply({
          lang,
          mode: "updated",
          updatedFields,
          data: {
            name: plainExisting.name,
            clientType: (plainExisting.clientType as "Resident" | "Tourist") || effectiveClientType,
            nationality: plainExisting.nationality,
            idNumber: plainExisting.idNumber,
            idExpiry: formatDateDisplay(plainExisting.idExpiry),
            passportNumber: plainExisting.passportNumber,
            passportExpiry: formatDateDisplay(plainExisting.passportExpiry),
            licenseNumber: plainExisting.licenseNumber,
            licenseIssuedBy: plainExisting.licenseIssuedBy,
            licenseExpiry: formatDateDisplay(plainExisting.licenseExpiry),
            internationalLicenseNumber: plainExisting.internationalLicenseNumber,
            internationalLicenseExpiry: formatDateDisplay(
              plainExisting.internationalLicenseExpiry
            ),
            phone: plainExisting.phone,
            email: plainExisting.email,
            documentsCount: Array.isArray(plainExisting.documents)
              ? plainExisting.documents.length
              : uploadedUrls.length,
          },
        }),
        action: "CLIENT_CREATED",
        data: {
          type: "clients",
          items: [buildClientCard(plainExisting)],
        },
      },
    };
  }

  // 4. Create New Client Document in MongoDB
  const clientPayload: Record<string, any> = {
    name: resolvedName,
    phone: finalPhone,
    email: finalEmail,
    nationality: finalNationality,
    address: finalAddress,
    gender: ocr.gender || undefined,
    dateOfBirth: normalizeDateOrNull(ocr.dateOfBirth),

    idNumber: finalIdNumber,
    idIssuedBy: ocr.idIssuedBy || undefined,
    idIssuedDate: normalizeDateOrNull(ocr.idIssuedDate),
    idExpiry: normalizeDateOrNull(ocr.idExpiry),

    passportNumber: finalPassportNumber || undefined,
    passportIssuedBy: ocr.passportIssuedBy || undefined,
    passportIssuedDate: normalizeDateOrNull(ocr.passportIssuedDate),
    passportExpiry: normalizeDateOrNull(ocr.passportExpiry),

    licenseNumber: finalLicenseNumber,
    licenseIssuedBy: ocr.licenseIssuedBy || undefined,
    licenseIssuedDate: normalizeDateOrNull(ocr.licenseIssuedDate),
    licenseExpiry: normalizeDateOrNull(ocr.licenseExpiry),

    internationalLicenseNumber: ocr.internationalLicenseNumber || undefined,
    internationalLicenseIssuedBy: ocr.internationalLicenseIssuedBy || undefined,
    internationalLicenseIssuedDate: normalizeDateOrNull(ocr.internationalLicenseIssuedDate),
    internationalLicenseExpiry: normalizeDateOrNull(ocr.internationalLicenseExpiry),

    visaNumber: ocr.visaNumber || undefined,
    visaExpiry: normalizeDateOrNull(ocr.visaExpiry),

    clientType: effectiveClientType,
    customerType: "B2C",
    status: "Active",
    documents: uploadedUrls,
  };

  let createdClient: any;
  try {
    createdClient = await resolvedDeps.ClientModel.create(clientPayload);
  } catch (err: any) {
    if (err?.code === 11000) {
      return {
        wantsContract: false,
        response: {
          reply: isAr
            ? "⚠️ يوجد عميل مسجل مسبقاً بنفس رقم الهوية أو الجواز."
            : "⚠️ A client with this ID or Passport number already exists.",
          action: "NONE",
        },
      };
    }
    throw err;
  }

  resolvedDeps.invalidateBackendContextCache();
  const plainCreated = createdClient.toObject ? createdClient.toObject() : createdClient;

  return {
    wantsContract: hints.wantsContract,
    client: plainCreated,
    response: {
      reply: formatClientSummaryReply({
        lang,
        mode: "created",
        data: {
          name: plainCreated.name,
          clientType: effectiveClientType,
          nationality: finalNationality,
          idNumber: finalIdNumber,
          idExpiry: ocr.idExpiry,
          passportNumber: finalPassportNumber,
          passportExpiry: ocr.passportExpiry,
          licenseNumber: finalLicenseNumber,
          licenseIssuedBy: ocr.licenseIssuedBy,
          licenseExpiry: ocr.licenseExpiry,
          internationalLicenseNumber: ocr.internationalLicenseNumber,
          internationalLicenseExpiry: ocr.internationalLicenseExpiry,
          phone: finalPhone,
          email: finalEmail,
          documentsCount: uploadedUrls.length,
        },
      }),
      action: "CLIENT_CREATED",
      data: {
        type: "clients",
        items: [buildClientCard(plainCreated)],
      },
    },
  };
}

export async function tryUpdateRecentClientContactFromFollowUp(params: {
  message: string;
  lang: string;
  lastAssistantMsg?: { sender: string; text: string; action?: string };
  deps?: Pick<ScannerDependencies, "connectDB" | "ClientModel" | "invalidateBackendContextCache">;
}): Promise<AiClientAssistantResponse | null> {
  const { message, lang, lastAssistantMsg, deps = {} } = params;
  if (lastAssistantMsg?.action !== "CLIENT_CREATED") return null;

  const trimmed = (message || "").trim();
  if (!trimmed || trimmed.length > 80) return null;

  // Guard against questions, vehicle/contract commands, or search queries
  if (
    /[?؟]/.test(trimmed) ||
    /\b(who|what|where|when|find|search|show|list|car|unit|vehicle|contract|book|rent|delete|open|go)\b|كم|من|أين|ابحث|سيارة|عقد|حجز/i.test(
      trimmed
    )
  ) {
    return null;
  }

  const hints = extractContactHintsFromMessage(trimmed);
  if (!hints.phone && !hints.email) return null;

  // Ensure remaining non-contact text is minimal (label words only, not an unrelated sentence)
  const stripped = toAsciiDigits(trimmed)
    .replace(hints.email || "", "")
    .replace(hints.phone || "", "")
    .replace(
      /\b(phone|tel|telephone|mobile|cell|number|email|mail|add|update|set|save|is|his|her|the|for|client)\b|رقم|رقمه|هاتف|هاتفه|جوال|جواله|ايميل|ايميله|بريد|بريده|اضف|أضف|حدث|هو|هذا|العميل/gi,
      ""
    )
    .replace(/[:\-.,،\s+]/g, "")
    .trim();

  if (stripped.length > 4) return null;

  // Extract name from previous assistant summary message
  const prevNameMatch = lastAssistantMsg.text.match(
    /\*\*(?:Name|الاسم):\*\*\s*([^\n]+)/i
  );
  const targetName = prevNameMatch?.[1]?.trim();
  if (!targetName) return null;

  const connect = deps.connectDB || connectDB;
  const Model = deps.ClientModel || Client;
  const invalidate = deps.invalidateBackendContextCache || invalidateBackendContextCache;

  await connect();
  const clientDoc = await Model.findOne({
    name: new RegExp(`^${escapeRegex(targetName)}$`, "i"),
  }).sort({ updatedAt: -1 });

  if (!clientDoc) return null;

  if (hints.phone) clientDoc.phone = hints.phone;
  if (hints.email) clientDoc.email = hints.email;
  await clientDoc.save();
  invalidate();

  const isAr = lang === "ar";
  const plain = clientDoc.toObject ? clientDoc.toObject() : clientDoc;
  const parts: string[] = [];
  if (hints.phone) parts.push(isAr ? `الهاتف: ${hints.phone}` : `Phone: ${hints.phone}`);
  if (hints.email) parts.push(isAr ? `البريد: ${hints.email}` : `Email: ${hints.email}`);

  return {
    reply: isAr
      ? `✅ تم تحديث بيانات العميل **${plain.name}** بنجاح (${parts.join(" | ")}).`
      : `✅ Updated contact details for **${plain.name}** (${parts.join(" | ")}).`,
    action: "CLIENT_CREATED",
    data: {
      type: "clients",
      items: [buildClientCard(plain)],
    },
  };
}

