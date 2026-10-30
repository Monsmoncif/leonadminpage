/**
 * Helper utilities for classifying clients (Resident vs Tourist)
 * and extracting identification information for contracts and print views.
 */

const UAE_AUTHORITY_KEYWORDS = [
  "uae",
  "united arab emirates",
  "dubai",
  "abu dhabi",
  "abudhabi",
  "sharjah",
  "ajman",
  "ras al khaim", // covers "Ras Al Khaima", "Ras Al Khaimah"
  "ras alkhaim",
  "rak",
  "fujairah",
  "fujairah police",
  "umm al quwain",
  "umm al-quwain",
  "uaq",
  "rta",
  "icp",
  "moi",
  "mitr", // MITR licensing authority in Ras Al Khaimah
];

const UAE_NATIONALITIES = [
  "uae",
  "united arab emirates",
  "emirati",
  "إماراتي",
  "اماراتي",
];

/**
 * Checks whether an ID string is a UAE Emirates ID.
 * Standard format is 784-YYYY-XXXXXXX-X (15 digits), or raw 15 digits starting with 784.
 */
export function hasEmiratesIdNumber(idStr?: string | null): boolean {
  if (!idStr) return false;
  const raw = String(idStr).trim();
  if (raw.startsWith("784-") || /^\d{3}-\d{4}-\d{7}-\d{1}$/.test(raw)) {
    return true;
  }
  const digits = raw.replace(/\D/g, "");
  return digits.length === 15 && digits.startsWith("784");
}

/**
 * Checks whether a license issuing authority is in the UAE.
 */
export function isUaeLicenseAuthority(issuedBy?: string | null): boolean {
  if (!issuedBy) return false;
  const lower = String(issuedBy).toLowerCase().trim();
  return UAE_AUTHORITY_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Determines whether a client is a UAE Resident (vs Tourist / Foreigner).
 *
 * Rules:
 * 1. Anyone with a 15-digit Emirates ID (starting with 784) is 100% a UAE Resident.
 * 2. Anyone explicitly marked clientType === "Resident" is a Resident.
 * 3. Anyone with a UAE-issued driving license (Dubai, RAK, Abu Dhabi, Sharjah, etc.)
 *    is a Resident (Tourists cannot obtain standard UAE driving licenses).
 * 4. Anyone with UAE / Emirati nationality is a Resident.
 * 5. Having a foreign nationality (e.g. Serbian, Indian, British) or a passport number
 *    DOES NOT make a client a Tourist if they have an Emirates ID or UAE license or Resident status.
 */
export function isResidentClient(client: any, contract?: any): boolean {
  if (!client && !contract) return false;

  const idNumber = client?.idNumber || contract?.customerIdNumber || client?.clientIdNumber;
  if (hasEmiratesIdNumber(idNumber)) {
    return true;
  }

  const clientType = String(client?.clientType || "").trim().toLowerCase();
  if (clientType === "resident") {
    return true;
  }

  const licenseAuthority = client?.licenseIssuedBy || client?.licenseIssuedAt || contract?.additionalDriverIssuedAt;
  if (isUaeLicenseAuthority(licenseAuthority) && clientType !== "tourist") {
    return true;
  }

  const nationality = String(client?.nationality || "").toLowerCase().trim();
  if (UAE_NATIONALITIES.includes(nationality)) {
    return true;
  }

  // If explicitly tourist and no Emirates ID
  if (clientType === "tourist") {
    return false;
  }

  // If license was issued by UAE authority, they are resident
  if (isUaeLicenseAuthority(licenseAuthority)) {
    return true;
  }

  // If they have international license or passport only, tourist
  if (client?.internationalLicenseNumber || (!idNumber && client?.passportNumber)) {
    return false;
  }

  return false;
}

export function isForeignerClient(client: any, contract?: any): boolean {
  return !isResidentClient(client, contract);
}

/**
 * Resolves the primary ID number and expiry to display for a client on contracts.
 */
export function getClientIdentification(client: any, contract?: any) {
  const isResident = isResidentClient(client, contract);
  const isForeigner = !isResident;

  const rawIdNumber = String(client?.idNumber || contract?.customerIdNumber || "").trim();
  const rawPassportNumber = String(client?.passportNumber || contract?.passportNumber || "").trim();

  const rawIdExpiry = client?.idExpiry || contract?.customerIdExpiry || "";
  const rawPassportExpiry = client?.passportExpiry || contract?.passportExpiry || "";

  return {
    isResident,
    isForeigner,
    idLabelEn: isForeigner ? "PASSPORT NO" : "EMIRATES ID NO",
    idLabelAr: isForeigner ? "رقم جواز السفر" : "رقم الهوية",
    idExpiryLabelEn: isForeigner ? "PASSPORT EXPIRY" : "ID EXPIRY",
    idExpiryLabelAr: isForeigner ? "تاريخ انتهاء الجواز" : "تاريخ انتهاء الهوية",
    displayIdNumber: isResident 
      ? (rawIdNumber || rawPassportNumber || "N/A")
      : (rawPassportNumber || rawIdNumber || "N/A"),
    displayIdExpiry: isResident
      ? (rawIdExpiry || rawPassportExpiry || "")
      : (rawPassportExpiry || rawIdExpiry || ""),
  };
}
