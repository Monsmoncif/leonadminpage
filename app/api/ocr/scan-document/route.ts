export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

    // 1. Upload image(s) to Cloudinary in parallel
    const uploadPromises = imagesList.map(async (img) => {
      try {
        if (img.startsWith("http://") || img.startsWith("https://")) {
          return img;
        }
        if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
          const uploadRes = await cloudinary.uploader.upload(img, {
            folder: "wheelzie_fleet/documents",
            resource_type: "auto",
            timeout: 60000,
          });
          return uploadRes.secure_url;
        }
      } catch (uploadErr) {
        console.warn("Cloudinary upload error in OCR route:", uploadErr);
      }
      return null;
    });

    const uploadedResults = await Promise.all(uploadPromises);
    const uploadedUrls: string[] = uploadedResults.filter(Boolean) as string[];

    // 2. Prepare formatted base64 data items for AI processing
    const parsedImages = await Promise.all(
      imagesList.map(async (img, idx) => {
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
          resolvedUrl: uploadedResults[idx] || (img.startsWith("http") ? img : fullDataUrl),
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
  "address": "Address if visible",
  "phone": "Phone number if visible",
  "email": "Email address if visible",
  "documentType": "passport" | "license" | "license_front" | "license_back" | "id_card" | "tourist_bundle" | "unknown"
}

Extraction Guidelines:
1. If a field is not visible, set its value to "" (empty string).
2. For dates, always convert to YYYY-MM-DD format (e.g., 2028-05-14).
3. If both passport and driving licence are present, ensure passport fields are placed in passportNumber/passportExpiry/etc., and licence fields in licenseNumber/licenseExpiry/etc.
4. For UAE documents: The Emirates ID (784-XXXX-XXXXXXX-X or بطاقة الهوية) maps to idNumber. UAE driving licence number (رخصة القيادة) maps to licenseNumber.
5. Return ONLY valid JSON. Do not include markdown code block backticks.`;

    let extracted: any = null;
    const errors: string[] = [];

    // Priority 1: Groq AI (Free + Fast)
    if (groqKey) {
      try {
        console.log("[OCR] Attempting Groq Vision...");
        extracted = await callGroqVision(groqKey, systemPrompt, parsedImages);
      } catch (groqErr: any) {
        console.error("Groq OCR error:", groqErr?.message || groqErr);
        errors.push(`Groq: ${groqErr?.message || groqErr}`);
      }
    }

    // Priority 2: Gemini AI (Free Fallback)
    if (!extracted && geminiKey) {
      try {
        console.log("[OCR] Attempting Gemini Vision fallback...");
        extracted = await callGeminiVision(geminiKey, systemPrompt, parsedImages);
      } catch (geminiErr: any) {
        console.error("Gemini OCR error:", geminiErr?.message || geminiErr);
        errors.push(`Gemini: ${geminiErr?.message || geminiErr}`);
      }
    }

    // Priority 3: OpenAI (Paid Fallback)
    if (!extracted && openaiKey) {
      try {
        console.log("[OCR] Attempting OpenAI Vision fallback...");
        extracted = await callOpenAIVision(openaiKey, systemPrompt, parsedImages);
      } catch (openaiErr: any) {
        console.error("OpenAI OCR error:", openaiErr?.message || openaiErr);
        errors.push(`OpenAI: ${openaiErr?.message || openaiErr}`);
      }
    }

    if (!extracted || typeof extracted !== "object") {
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

    const resolvedIdNumber =
      extracted.idNumber || extracted.passportNumber || "";

    const allImageUrls = parsedImages.map((p) => p.resolvedUrl);

    return NextResponse.json({
      success: true,
      data: {
        name: resolvedName,
        firstName: extracted.firstName || "",
        middleName: extracted.middleName || "",
        lastName: extracted.lastName || "",
        gender: extracted.gender || "",
        dateOfBirth: extracted.dateOfBirth || "",
        nationality: extracted.nationality || "",

        // Tourist Passport Fields
        passportNumber: extracted.passportNumber || resolvedIdNumber || "",
        passportIssuedBy: extracted.passportIssuedBy || "",
        passportIssuedDate: extracted.passportIssuedDate || "",
        passportExpiry: extracted.passportExpiry || "",

        // Driving License Fields
        licenseNumber: extracted.licenseNumber || "",
        licenseIssuedBy: extracted.licenseIssuedBy || "",
        licenseIssuedDate: extracted.licenseIssuedDate || "",
        licenseExpiry: extracted.licenseExpiry || "",

        // International Driving License Fields
        internationalLicenseNumber: extracted.internationalLicenseNumber || "",
        internationalLicenseIssuedBy: extracted.internationalLicenseIssuedBy || "",
        internationalLicenseIssuedDate: extracted.internationalLicenseIssuedDate || "",
        internationalLicenseExpiry: extracted.internationalLicenseExpiry || "",

        // Visa Fields
        visaNumber: extracted.visaNumber || "",
        visaExpiry: extracted.visaExpiry || "",

        // Standard Fields
        idNumber: resolvedIdNumber,
        address: extracted.address || "",
        phone: extracted.phone || "",
        email: extracted.email || "",
        documentType: extracted.documentType || "unknown",
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
    },
  };

  const aiRes = await fetch(geminiEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(geminiPayload),
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
    max_tokens: 4096,
    response_format: { type: "json_object" },
  };

  const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqKey}`,
    },
    body: JSON.stringify(payload),
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
        detail: "high",
      },
    });
  }

  const model = process.env.OPENAI_OCR_MODEL || "gpt-4o-mini";
  const payload = {
    model,
    messages: [{ role: "user", content: messageContent }],
    response_format: { type: "json_object" },
    temperature: 0.1,
  };

  const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify(payload),
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
