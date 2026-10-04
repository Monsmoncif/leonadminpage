export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Cooldown tracker to skip failing or decommissioned AI providers
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
        { error: "لم يتم تقديم أي صورة لبطاقة ملكية المركبة (No vehicle card image provided)" },
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

    // 1. Prepare base64 images
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
            console.warn("Could not read local file for Vehicle Card OCR:", img, localErr);
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
            console.warn("Could not fetch remote image for Vehicle Card OCR:", img, fetchErr);
          }
        } else {
          // Check if absolute path (e.g. local scratch or uploaded file)
          try {
            const fileBuffer = await fs.readFile(img);
            const ext = path.extname(img).toLowerCase().replace(".", "");
            mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
            base64Data = fileBuffer.toString("base64");
            fullDataUrl = `data:${mimeType};base64,${base64Data}`;
          } catch {
            // Treat as raw base64 string
            base64Data = img;
            fullDataUrl = `data:image/jpeg;base64,${img}`;
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

    // 2. High-precision Vehicle Registration Card / Mulkiya prompt
    const systemPrompt = `You are an expert AI OCR specialized in extracting vehicle registration documents (Mulkiya / رخصة مركبة / Vehicle License / Carte Grise).
The image provided may show:
- UAE Vehicle License (RTA Dubai, Abu Dhabi, Sharjah, etc.) front, back, or both sides
- GCC Vehicle Registration cards (Saudi Arabia, Qatar, Kuwait, Bahrain, Oman)
- European / North American / International Car Title or Registration (Carte Grise)

Carefully read all Arabic and English text from the card (front and back sides).
Extract all vehicle data accurately and return STRICTLY a JSON object matching this schema:
{
  "plate": "Traffic Plate Number formatted nicely (e.g., 'N 32746' or 'A 12345' or '32746')",
  "plateCode": "Plate code or category letter/symbol if present (e.g. 'N')",
  "plateNumber": "Plate digits (e.g. '32746')",
  "owner": "Owner legal entity or person name in English (e.g., 'NEON DRIVE CAR RENTAL L.L.C'). If only Arabic exists, provide transliteration or Arabic name",
  "ownerAr": "Owner name in Arabic if present (e.g., 'نيون درايف لتأجير السيارات ش.ذ.م.م')",
  "make": "Vehicle Brand / Manufacturer in English with proper casing (e.g., 'Nissan', 'Toyota', 'Mercedes-Benz', 'BMW', 'Hyundai', 'Ford', 'Audi', 'Land Rover', 'Porsche')",
  "model": "Vehicle Model name in English (e.g., 'Patrol', 'Land Cruiser', 'Camry', 'Civic', 'X5', 'Range Rover', 'Defender', 'Prado', 'Tucson'). Note: If Veh. Type says 'NISSAN PATROL', make is 'Nissan' and model is 'Patrol'",
  "year": 2025,
  "color": "Exterior color in English (e.g., 'White', 'Black', 'White/Black', 'Silver', 'Grey', 'Blue', 'Red', 'Gold'). If Arabic says 'ابيض/اسود', translate to 'White/Black'",
  "colorAr": "Color in Arabic if present (e.g. 'ابيض/اسود')",
  "vin": "Chassis Number / VIN / رقم القاعدة (17 characters alphanumeric, e.g. 'JN8AY3NY1S9007801')",
  "capacity": 8,
  "registrationExpiry": "YYYY-MM-DD",
  "registrationDate": "YYYY-MM-DD",
  "insuranceExpiry": "YYYY-MM-DD",
  "insuranceCompany": "Name of insurance company if visible",
  "policyNumber": "Insurance policy number if visible",
  "trafficNumber": "Traffic Code / T.C. No. / الرمز المروري if visible (e.g., '51666633')",
  "engineNumber": "Engine Number / رقم المحرك if visible (e.g., 'VR35 025655A')",
  "placeOfIssue": "Place of issue in English or Arabic (e.g. 'Dubai' / 'دبي')",
  "vehicleType": "Vehicle classification/body type (e.g. 'Station Wagon / SUV' or 'Sedan' or 'Coupe')"
}

CRITICAL RULES:
1. Always convert dates to standard ISO YYYY-MM-DD format:
   - For example: '21/06/2027' -> '2027-06-21'.
   - '29/06/2026' -> '2026-06-29'.
   - '21/07/2027' -> '2027-07-21'.
2. The Model / سنة الصنع should be returned as an integer (e.g. 2025).
3. The capacity / Num. of Pass. / عدد الركاب should be returned as an integer (e.g. 8). If not visible, default to 5.
4. For Veh. Type like 'NISSAN PATROL', cleanly separate make ('Nissan') and model ('Patrol').
5. Chassis No. / رقم القاعدة is the VIN. Make sure all characters (e.g. JN8AY3NY1S9007801) are transcribed accurately without spaces.
6. Traffic Plate No. like 'N / 32746' should be formatted as 'N 32746'.
7. Return ONLY valid JSON. No markdown code blocks, no explanations.`;

    const errors: string[] = [];

    async function scanImagesBatch(imagesToProcess: any[]): Promise<any> {
      let ext: any = null;

      // Priority 1: Groq AI (Free + Fast)
      if (groqKey && isProviderAvailable("groq")) {
        try {
          ext = await callGroqVision(groqKey, systemPrompt, imagesToProcess);
        } catch (groqErr: any) {
          markProviderFailed("groq", 60000);
          console.error("Groq Vehicle OCR error:", groqErr?.message || groqErr);
          errors.push(`Groq: ${groqErr?.message || groqErr}`);
        }
      }

      // Priority 2: Gemini AI (Free Fallback)
      if (!ext && geminiKey && isProviderAvailable("gemini")) {
        try {
          ext = await callGeminiVision(geminiKey, systemPrompt, imagesToProcess);
        } catch (geminiErr: any) {
          markProviderFailed("gemini", 60000);
          console.error("Gemini Vehicle OCR error:", geminiErr?.message || geminiErr);
          errors.push(`Gemini: ${geminiErr?.message || geminiErr}`);
        }
      }

      // Priority 3: OpenAI (Paid Fallback)
      if (!ext && openaiKey && isProviderAvailable("openai")) {
        try {
          ext = await callOpenAIVision(openaiKey, systemPrompt, imagesToProcess);
        } catch (openaiErr: any) {
          markProviderFailed("openai", 15000);
          console.error("OpenAI Vehicle OCR error:", openaiErr?.message || openaiErr);
          errors.push(`OpenAI: ${openaiErr?.message || openaiErr}`);
        }
      }

      return ext;
    }

    let extracted: any = null;
    if (parsedImages.length === 1) {
      extracted = await scanImagesBatch(parsedImages);
    } else {
      // Multiple images provided (e.g. separate front and back photos)
      extracted = await scanImagesBatch(parsedImages);
      // Fallback merge if incomplete
      if (!extracted || (!extracted.plate && !extracted.vin)) {
        const individualResults = await Promise.all(
          parsedImages.map((img) => scanImagesBatch([img]))
        );
        const merged: any = {};
        for (const res of individualResults) {
          if (!res || typeof res !== "object") continue;
          for (const [k, v] of Object.entries(res)) {
            if (v !== undefined && v !== null && v !== "") {
              if (!merged[k] || merged[k] === "") {
                merged[k] = v;
              }
            }
          }
        }
        if (Object.keys(merged).length > 0) {
          extracted = merged;
        }
      }
    }

    if (!extracted || typeof extracted !== "object" || Object.keys(extracted).length === 0) {
      throw new Error(
        `فشل استخراج بيانات رخصة المركبة عبر الذكاء الاصطناعي. تفاصيل الأخطاء: ${errors.join(" | ")}`
      );
    }

    // Clean up plate format if needed
    let cleanPlate = (extracted.plate || "").trim();
    if (cleanPlate.includes("/")) {
      cleanPlate = cleanPlate.replace(/\s*\/\s*/g, " ").trim();
    }

    // Clean up make & model
    let cleanMake = (extracted.make || "").trim();
    let cleanModel = (extracted.model || "").trim();
    if (cleanMake && cleanModel.toLowerCase().startsWith(cleanMake.toLowerCase())) {
      cleanModel = cleanModel.slice(cleanMake.length).trim();
    }

    const allImageUrls = parsedImages.map((p) => p.resolvedUrl);

    return NextResponse.json({
      success: true,
      data: {
        plate: cleanPlate,
        plateCode: extracted.plateCode || "",
        plateNumber: extracted.plateNumber || "",
        owner: extracted.owner || extracted.ownerAr || "",
        ownerAr: extracted.ownerAr || "",
        make: cleanMake,
        model: cleanModel,
        year: Number(extracted.year) || new Date().getFullYear(),
        color: extracted.color || "",
        colorAr: extracted.colorAr || "",
        vin: (extracted.vin || "").replace(/\s+/g, "").toUpperCase(),
        capacity: Number(extracted.capacity) || 5,
        registrationExpiry: extracted.registrationExpiry || "",
        registrationDate: extracted.registrationDate || "",
        insuranceExpiry: extracted.insuranceExpiry || "",
        insuranceCompany: extracted.insuranceCompany || "",
        policyNumber: extracted.policyNumber || "",
        trafficNumber: extracted.trafficNumber || "",
        engineNumber: extracted.engineNumber || "",
        placeOfIssue: extracted.placeOfIssue || "",
        vehicleType: extracted.vehicleType || "",
      },
      imageUrl: allImageUrls[0] || null,
      imageUrls: allImageUrls,
    });
  } catch (error: any) {
    console.error("Vehicle Card OCR Route Error:", error);
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء مسح رخصة المركبة" },
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
    signal: AbortSignal.timeout(8000),
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
