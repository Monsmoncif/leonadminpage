export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Date normalization helper to guarantee standard YYYY-MM-DD output for HTML date inputs
function normalizeDateToISO(rawDate: any): string {
  if (!rawDate || typeof rawDate !== "string") return "";
  let str = rawDate.trim();
  if (!str) return "";

  // Convert Arabic & Persian digits to ASCII digits
  str = str.replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1632 + 48));
  str = str.replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1776 + 48));

  // Remove ordinal suffixes (1st, 2nd, 3rd, 14th)
  str = str.replace(/(\d+)(st|nd|rd|th)/gi, "$1");

  // Format 1: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, "0");
    const day = ymdMatch[3].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Format 2: DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Format 3: Parse standard textual date string e.g. "14 May 2028"
  try {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split("T")[0];
    }
  } catch {
    // ignore
  }

  return "";
}

// Cooldown tracker to skip failing or decommissioned AI providers instead of waiting on repeated timeouts
const providerCooldown = new Map<string, number>();

function isProviderAvailable(providerName: string): boolean {
  const until = providerCooldown.get(providerName);
  if (!until) return true;
  if (Date.now() > until) {
    providerCooldown.delete(providerName);
    return true;
  }
  return false;
}

function markProviderFailed(providerName: string, cooldownMs = 60000) {
  providerCooldown.set(providerName, Date.now() + cooldownMs);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const imagesList: string[] =
      Array.isArray(body.images) && body.images.length > 0
        ? body.images
        : body.image
        ? [body.image]
        : [];

    if (imagesList.length === 0) {
      return NextResponse.json(
        { error: "لم يتم تقديم أي صورة للمسح الضوئي (No image provided)" },
        { status: 400 }
      );
    }

    const rawOpenai = process.env.OPENAI_API_KEY || "";
    const openaiKey = rawOpenai.trim().replace(/^["']|["']$/g, "");
    const rawGemini = process.env.GEMINI_API_KEY || "";
    const geminiKey = rawGemini.trim().replace(/^["']|["']$/g, "");
    const rawGroq = process.env.GROQ_API_KEY || "";
    const groqKey = rawGroq.trim().replace(/^["']|["']$/g, "");

    if (!openaiKey && !geminiKey && !groqKey) {
      return NextResponse.json(
        {
          error:
            "مفتاح الذكاء الاصطناعي (GROQ_API_KEY أو GEMINI_API_KEY أو OPENAI_API_KEY) غير متوفر في ملف .env.local.",
        },
        { status: 500 }
      );
    }

    // 1. Prepare formatted base64 data items for AI processing
    const parsedImages = await Promise.all(
      imagesList.map(async (img) => {
        let mimeType = "image/jpeg";
        let base64Data = img;
        let fullDataUrl = img;

        if (img.startsWith("data:")) {
          const match = img.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            mimeType = match[1];
            base64Data = match[2];
          } else {
            base64Data = img.split(",")[1] || img;
          }
          fullDataUrl = img;
        } else if (img.startsWith("/uploads/") || img.startsWith("uploads/")) {
          try {
            const cleanPath = img.replace(/^\/+/, "");
            const filePath = path.join(process.cwd(), "public", cleanPath);
            const fileBuffer = await fs.readFile(filePath);
            const ext = path.extname(filePath).toLowerCase().replace(".", "");
            mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
            base64Data = fileBuffer.toString("base64");
            fullDataUrl = `data:${mimeType};base64,${base64Data}`;
          } catch (localErr) {
            console.warn("Could not read local file for OCR:", img, localErr);
          }
        } else if (img.startsWith("http://") || img.startsWith("https://")) {
          try {
            const resp = await fetch(img);
            if (resp.ok) {
              const arrayBuffer = await resp.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              mimeType = resp.headers.get("content-type") || "image/jpeg";
              base64Data = buffer.toString("base64");
              fullDataUrl = `data:${mimeType};base64,${base64Data}`;
            }
          } catch (fetchErr) {
            console.warn("Could not fetch remote image for OCR:", img, fetchErr);
          }
        }

        return {
          mimeType,
          base64Data,
          fullDataUrl,
          resolvedUrl: fullDataUrl,
        };
      })
    );

    // 3. Document Extraction Prompt for both Residents and Tourists
    const systemPrompt = `You are a high-precision document OCR and identity extraction system for a vehicle rental company.
The provided image(s) can include one or more official documents:
- Passport (identification & bio page)
- Driving Licence (UAE Driving Licence, GCC, EU, US, or International Licence)
- International Driving Permit / Visa
- National Identity Card (e.g. UAE Emirates ID 784-XXXX-XXXXXXX-X, GCC ID, or National ID)

Analyze all provided images with maximum precision across Arabic, French, and English text.
If multiple images are provided (such as a tourist's Passport and Driving Licence Front & Back), cross-reference and merge all fields into a single complete customer profile.

Extract the relevant fields and return STRICTLY a JSON object matching this schema:
{
  "name": "Full legal name in English / Latin script",
  "firstName": "First name / Given name (English)",
  "middleName": "Middle name (English) or empty if none",
  "lastName": "Last name / Surname / Family name (English)",
  "gender": "Male" | "Female" | "",
  "dateOfBirth": "YYYY-MM-DD",
  "nationality": "Nationality or country in English (e.g., 'Emirati', 'French', 'British', 'American', 'Saudi', 'German', 'Spanish', etc.)",

  "passportNumber": "Passport number if visible",
  "passportIssuedBy": "Issuing country or authority of passport",
  "passportIssuedDate": "Passport issue date in YYYY-MM-DD format",
  "passportExpiry": "Passport expiry date in YYYY-MM-DD format",

  "licenseNumber": "Driving licence number",
  "licenseIssuedBy": "Issuing country or state/authority of driving licence",
  "licenseIssuedDate": "Driving licence issue date in YYYY-MM-DD format",
  "licenseExpiry": "Driving licence expiry date in YYYY-MM-DD format",

  "internationalLicenseNumber": "International driving permit number if present",
  "internationalLicenseIssuedBy": "Issuing authority of international licence",
  "internationalLicenseIssuedDate": "International licence issue date in YYYY-MM-DD format",
  "internationalLicenseExpiry": "International licence expiry date in YYYY-MM-DD format",

  "visaNumber": "Visa or entry stamp number if visible",
  "visaExpiry": "Visa expiry date in YYYY-MM-DD format",

  "idNumber": "Emirates ID number (784-XXXX-XXXXXXX-X) or National ID or Passport Number",
  "idIssuedBy": "Issuing authority of Emirates ID / National ID (e.g. ICP / UAE / Federal Authority for Identity)",
  "idIssuedDate": "Emirates ID / National ID issue date in YYYY-MM-DD format if visible",
  "idExpiry": "Emirates ID / National ID expiry date in YYYY-MM-DD format if visible",
  "address": "Address if visible",
  "phone": "Phone number if visible",
  "email": "Email address if visible",
  "documentType": "passport" | "license" | "license_front" | "license_back" | "emirates_id" | "id_card" | "tourist_bundle" | "unknown"
}

Extraction Guidelines:
1. If a field is not visible, set its value to "" (empty string).
2. For dates, always convert to YYYY-MM-DD format (e.g., 2028-05-14).
3. If both passport and driving licence are present, ensure passport fields are placed in passportNumber/passportExpiry/etc., and licence fields in licenseNumber/licenseExpiry/etc.
4. For UAE Emirates ID (بطاقة الهوية الإماراتية):
   - idNumber: 15-digit number formatted as 784-XXXX-XXXXXXX-X.
   - idIssuedBy: Issuing authority. For any UAE Emirates ID, output "ICP / UAE".
   - idIssuedDate: Look for Issue Date / تاريخ الإصدار (often printed on back or front) converted to YYYY-MM-DD.
   - idExpiry: Look for Expiry Date / تاريخ الانتهاء / Valid Until (often on back or front) converted to YYYY-MM-DD.
5. For UAE Driving Licence (رخصة القيادة الإماراتية):
   - licenseNumber: Licence number / رقم الرخصة (e.g., 5031657).
   - licenseIssuedBy: Issuing authority / جهة الإصدار (e.g., Dubai, Abu Dhabi, Sharjah, RTA).
   - licenseIssuedDate: Issue date in YYYY-MM-DD.
   - licenseExpiry: Expiry date in YYYY-MM-DD.
6. Return ONLY valid JSON. Do not include markdown code block backticks.`;

    const errors: string[] = [];

    // Helper to scan a batch of images through AI providers
    async function scanImagesBatch(imagesToProcess: any[]): Promise<any> {
      let ext: any = null;

      // Priority 1: Groq AI (Free + Fast Vision)
      if (groqKey && isProviderAvailable("groq")) {
        try {
          ext = await callGroqVision(groqKey, systemPrompt, imagesToProcess);
        } catch (groqErr: any) {
          // Short cooldown (5s) for transient network hiccups rather than 60s
          markProviderFailed("groq", 5000);
          console.error("Groq OCR error:", groqErr?.message || groqErr);
          errors.push(`Groq: ${groqErr?.message || groqErr}`);
        }
      }

      // Priority 2: Gemini AI (Fallback)
      if (!ext && geminiKey && isProviderAvailable("gemini")) {
        try {
          ext = await callGeminiVision(geminiKey, systemPrompt, imagesToProcess);
        } catch (geminiErr: any) {
          markProviderFailed("gemini", 60000);
          console.error("Gemini OCR error:", geminiErr?.message || geminiErr);
          errors.push(`Gemini: ${geminiErr?.message || geminiErr}`);
        }
      }

      // Priority 3: OpenAI (Fallback)
      if (!ext && openaiKey && isProviderAvailable("openai")) {
        try {
          ext = await callOpenAIVision(openaiKey, systemPrompt, imagesToProcess);
        } catch (openaiErr: any) {
          markProviderFailed("openai", 60000);
          console.error("OpenAI OCR error:", openaiErr?.message || openaiErr);
          errors.push(`OpenAI: ${openaiErr?.message || openaiErr}`);
        }
      }

      // Final fallback: if other providers failed or were unavailable and Groq had a temporary error, retry Groq once
      if (!ext && groqKey && errors.length > 0) {
        try {
          console.log("[OCR] Retrying Groq vision as last-resort fallback...");
          ext = await callGroqVision(groqKey, systemPrompt, imagesToProcess);
        } catch (retryErr: any) {
          console.error("Groq OCR fallback retry error:", retryErr?.message || retryErr);
        }
      }

      return ext;
    }

    let extracted: any = null;

    if (parsedImages.length === 1) {
      extracted = await scanImagesBatch(parsedImages);
    } else {
      // Multiple document images provided:
      // First attempt: pass all images in ONE single unified call (fastest, 1-2s, vision model correlates context across all docs)
      console.log(`[OCR] Scanning ${parsedImages.length} documents in unified pass for high speed...`);
      extracted = await scanImagesBatch(parsedImages);

      // If the unified pass missed critical data, fallback to scanning each individually
      const hasCoreData = extracted && typeof extracted === "object" && (extracted.name || extracted.passportNumber || extracted.licenseNumber || extracted.idNumber);
      if (!hasCoreData) {
        console.log(`[OCR] Unified pass returned incomplete data, falling back to parallel scanning...`);
        const results = await Promise.all(
          parsedImages.map((img) => scanImagesBatch([img]))
        );

        // Merge all extracted results from every document
        const merged: any = {};
        for (const item of results) {
          if (!item || typeof item !== "object") continue;
          for (const [key, val] of Object.entries(item)) {
            if (val && typeof val === "string" && val.trim() !== "") {
              const trimmed = val.trim();
              if (!merged[key] || merged[key].trim() === "") {
                merged[key] = trimmed;
              } else if (key === "name" && trimmed.length > merged[key].length) {
                merged[key] = trimmed;
              } else if (key === "idNumber" && trimmed.startsWith("784-")) {
                merged[key] = trimmed;
              }
            }
          }
        }
        if (Object.keys(merged).length > 0) {
          extracted = merged;
        }
      }

      if (extracted && extracted.passportNumber && extracted.licenseNumber) {
        extracted.documentType = "tourist_bundle";
      }
    }

    if (!extracted || typeof extracted !== "object" || Object.keys(extracted).length === 0) {
      throw new Error(
        `فشل استخراج البيانات عبر محركات الذكاء الاصطناعي. تفاصيل الأخطاء: ${errors.join(" | ")}`
      );
    }

    // Compose full name if parts were extracted
    const fullNameParts = [
      extracted.firstName,
      extracted.middleName,
      extracted.lastName,
    ].filter(Boolean);
    const resolvedName =
      extracted.name || (fullNameParts.length > 0 ? fullNameParts.join(" ") : "");

    // Clean identification numbers
    const rawId = (extracted.idNumber || "").trim();
    let rawPassport = (extracted.passportNumber || "").trim();

    let resolvedIdNumber = rawId;
    let resolvedPassportNumber = rawPassport;

    // Determine normalized document type
    let docType = (extracted.documentType || "unknown").toLowerCase();
    if (resolvedIdNumber.startsWith("784") || docType.includes("emirates") || docType.includes("id_card")) {
      docType = "emirates_id";
    } else if (docType.includes("tourist")) {
      docType = "tourist_bundle";
    } else if (docType.includes("passport")) {
      docType = "passport";
      if (!resolvedIdNumber && resolvedPassportNumber) {
        resolvedIdNumber = resolvedPassportNumber;
      }
    } else if (docType.includes("license")) {
      docType = "license";
    }

    // Safety: Emirates ID should NEVER be set as passportNumber
    if (resolvedPassportNumber.startsWith("784") || (resolvedPassportNumber === resolvedIdNumber && docType === "emirates_id")) {
      resolvedPassportNumber = "";
    }

    const allImageUrls = parsedImages.map((p) => p.resolvedUrl);

    return NextResponse.json({
      success: true,
      data: {
        name: resolvedName,
        firstName: extracted.firstName || "",
        middleName: extracted.middleName || "",
        lastName: extracted.lastName || "",
        gender: extracted.gender || "",
        dateOfBirth: normalizeDateToISO(extracted.dateOfBirth),
        nationality: extracted.nationality || "",

        // Tourist Passport Fields
        passportNumber: resolvedPassportNumber,
        passportIssuedBy: extracted.passportIssuedBy || "",
        passportIssuedDate: normalizeDateToISO(extracted.passportIssuedDate),
        passportExpiry: normalizeDateToISO(extracted.passportExpiry),

        // Driving License Fields
        licenseNumber: extracted.licenseNumber || "",
        licenseIssuedBy: extracted.licenseIssuedBy || "",
        licenseIssuedDate: normalizeDateToISO(extracted.licenseIssuedDate),
        licenseExpiry: normalizeDateToISO(extracted.licenseExpiry),

        // International Driving License Fields
        internationalLicenseNumber: extracted.internationalLicenseNumber || "",
        internationalLicenseIssuedBy: extracted.internationalLicenseIssuedBy || "",
        internationalLicenseIssuedDate: normalizeDateToISO(extracted.internationalLicenseIssuedDate),
        internationalLicenseExpiry: normalizeDateToISO(extracted.internationalLicenseExpiry),

        // Visa Fields
        visaNumber: extracted.visaNumber || "",
        visaExpiry: normalizeDateToISO(extracted.visaExpiry),

        // Standard / Emirates ID Fields
        idNumber: resolvedIdNumber,
        idIssuedBy: extracted.idIssuedBy?.trim() || (resolvedIdNumber.startsWith("784") || docType === "emirates_id" ? "ICP / UAE" : ""),
        idIssuedDate: normalizeDateToISO(extracted.idIssuedDate),
        idExpiry: normalizeDateToISO(extracted.idExpiry),

        address: extracted.address || "",
        phone: extracted.phone || "",
        email: extracted.email || "",
        documentType: docType,
      },
      imageUrl: allImageUrls[0] || null,
      imageUrls: allImageUrls,
    });
  } catch (error: any) {
    console.error("OCR Route Error:", error);
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء معالجة الوثيقة" },
      { status: 500 }
    );
  }
}

function extractJsonFromText(content: string): any {
  if (!content) return {};
  try {
    const cleanJson = content
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/g, "")
      .trim();
    return JSON.parse(cleanJson);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e) {
        console.error("Failed to parse regex-extracted JSON:", e);
      }
    }
    return {};
  }
}

async function callGeminiVision(geminiKey: string, systemPrompt: string, parsedImages: any[]) {
  const geminiModel = process.env.GEMINI_OCR_MODEL || "gemini-1.5-flash";
  const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`;
  const geminiParts: any[] = [{ text: systemPrompt }];

  for (const item of parsedImages) {
    geminiParts.push({
      inline_data: {
        mime_type: item.mimeType,
        data: item.base64Data,
      },
    });
  }

  const geminiPayload = {
    contents: [
      {
        parts: geminiParts,
      },
    ],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: "application/json",
      maxOutputTokens: 1500,
    },
  };

  const aiRes = await fetch(geminiEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(geminiPayload),
    signal: AbortSignal.timeout(10000),
  });

  if (!aiRes.ok) {
    const errText = await aiRes.text();
    console.error("Gemini API error:", errText);
    throw new Error(`Gemini OCR failed (${aiRes.status}): ${errText}`);
  }

  const aiData = await aiRes.json();
  const candidateText =
    aiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "{}";

  return extractJsonFromText(candidateText);
}

async function callGroqVision(groqKey: string, systemPrompt: string, parsedImages: any[]) {
  const messageContent: any[] = [
    { type: "text", text: systemPrompt },
  ];

  for (const item of parsedImages) {
    messageContent.push({
      type: "image_url",
      image_url: {
        url: item.fullDataUrl,
      },
    });
  }

  const model = process.env.GROQ_OCR_MODEL || "qwen/qwen3.8-27b";
  const payload = {
    model,
    messages: [{ role: "user", content: messageContent }],
    temperature: 0.1,
    max_tokens: 1500,
    response_format: { type: "json_object" },
  };

  const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqKey}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(45000),
  });

  if (!aiRes.ok) {
    const errText = await aiRes.text();
    console.error("Groq API error:", aiRes.status, errText);
    throw new Error(`Groq OCR failed (${aiRes.status}): ${errText}`);
  }

  const aiData = await aiRes.json();
  const content = aiData.choices?.[0]?.message?.content?.trim() || "{}";

  return extractJsonFromText(content);
}

async function callOpenAIVision(openaiKey: string, systemPrompt: string, parsedImages: any[]) {
  const messageContent: any[] = [
    { type: "text", text: systemPrompt },
  ];

  for (const item of parsedImages) {
    messageContent.push({
      type: "image_url",
      image_url: {
        url: item.resolvedUrl,
        detail: "auto",
      },
    });
  }

  const model = process.env.OPENAI_OCR_MODEL || "gpt-4o-mini";
  const payload = {
    model,
    messages: [{ role: "user", content: messageContent }],
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 1500,
  };

  const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(12000),
  });

  if (!aiRes.ok) {
    const errText = await aiRes.text();
    console.error("OpenAI API error:", aiRes.status, errText);
    throw new Error(`OpenAI OCR failed (${aiRes.status}): ${errText}`);
  }

  const aiData = await aiRes.json();
  const content = aiData.choices?.[0]?.message?.content?.trim() || "{}";

  return extractJsonFromText(content);
}
