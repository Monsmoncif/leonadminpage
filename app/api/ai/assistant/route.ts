export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Client } from "@/models/Client";
import { Unit } from "@/models/Unit";
import { Contract } from "@/models/Contract";

interface AssistantResponse {
  reply: string;
  action?:
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
  uiAction?:
    | "OPEN_ADD_CLIENT_MODAL"
    | "OPEN_ADD_COMPANY_MODAL"
    | "OPEN_ADD_UNIT_MODAL"
    | "CLICK_BUTTON";
  uiTarget?: string;
  navigateUrl?: string;
  data?: {
    type?: "clients" | "vehicles" | "contracts" | "overview";
    items?: any[];
    stats?: Record<string, any>;
  };
}

// Helper: parse vehicle details from raw text (e.g. "Chevrolet Corvette (C8) Black • 2024 Plate: GG10273")
function parseCarDetails(raw: string) {
  let text = (raw || "").trim();

  // 1. Extract Plate
  let plate = "";
  const plateLabelMatch = text.match(/(?:plate|لوحة|رقم|plaque)[:\s]*([A-Za-z0-9\s-]+)/i);
  if (plateLabelMatch) {
    plate = plateLabelMatch[1].trim().replace(/\s+/g, " ");
    text = text.replace(plateLabelMatch[0], "").trim();
  } else {
    const plateCodeMatch = text.match(/\b([A-Z]{1,3}\s*\d{3,6})\b/);
    if (plateCodeMatch) {
      plate = plateCodeMatch[1].trim();
      text = text.replace(plateCodeMatch[0], "").trim();
    }
  }

  // 2. Extract Year
  let year = 2024;
  const yearMatch = text.match(/\b(19\d{2}|20[2-3]\d)\b/);
  if (yearMatch) {
    year = parseInt(yearMatch[1], 10);
    text = text.replace(yearMatch[0], "").trim();
  }

  // 3. Extract Color
  let color = "Black";
  const colorMatch = text.match(
    /\b(Black|White|Silver|Grey|Gray|Red|Blue|Green|Yellow|Orange|Gold|Brown|أسود|أبيض|فضي|رمادي|أحمر|أزرق)\b/i
  );
  if (colorMatch) {
    const rawColor = colorMatch[1];
    text = text.replace(colorMatch[0], "").trim();
    const cLower = rawColor.toLowerCase();
    if (cLower === "أسود" || cLower === "black") color = "Black";
    else if (cLower === "أبيض" || cLower === "white") color = "White";
    else if (cLower === "فضي" || cLower === "silver") color = "Silver";
    else if (cLower === "رمادي" || cLower === "grey" || cLower === "gray") color = "Grey";
    else if (cLower === "أحمر" || cLower === "red") color = "Red";
    else if (cLower === "أزرق" || cLower === "blue") color = "Blue";
    else color = rawColor.charAt(0).toUpperCase() + rawColor.slice(1).toLowerCase();
  }

  // Clean symbols
  text = text.replace(/[•|,:–—]/g, " ").replace(/\s+/g, " ").trim();

  // 4. Known car brands
  const knownBrands = [
    "Chevrolet",
    "Mercedes-Benz",
    "Mercedes",
    "BMW",
    "Audi",
    "Porsche",
    "Lamborghini",
    "Ferrari",
    "Bentley",
    "Rolls-Royce",
    "Rolls Royce",
    "Range Rover",
    "Land Rover",
    "Nissan",
    "Toyota",
    "Ford",
    "Hyundai",
    "Kia",
    "Lexus",
    "Cadillac",
    "Dodge",
    "Jeep",
    "GMC",
    "Tesla",
    "Maserati",
    "Aston Martin",
    "McLaren",
    "Volkswagen",
    "Honda",
    "شفروليه",
    "مرسيدس",
    "بي ام دبليو",
    "نيسان",
    "تويوتا",
  ];

  let make = "";
  let model = "";

  for (const b of knownBrands) {
    const rx = new RegExp(`^${b}\\b`, "i");
    if (rx.test(text)) {
      make = b;
      model = text.replace(rx, "").trim();
      break;
    }
  }

  if (!make) {
    const parts = text.split(" ");
    make = parts[0] || "Chevrolet";
    model = parts.slice(1).join(" ") || "Sedan";
  }

  if (!model) {
    model = "Sedan";
  }

  if (make.toLowerCase() === "mercedes" || make === "مرسيدس") make = "Mercedes-Benz";
  if (make === "شفروليه") make = "Chevrolet";
  if (make === "بي ام دبليو") make = "BMW";
  if (make === "نيسان") make = "Nissan";
  if (make === "تويوتا") make = "Toyota";

  if (!plate) {
    plate = `DXB-${Math.floor(10000 + Math.random() * 90000)}`;
  }

  return { make, model, year, color, plate };
}

// Helper: parse dates from user message (e.g. "from today now too 14/11/2026")
function parseRentalDates(message: string, todayDate: string) {
  let startDate = todayDate;
  let endDate: string | null = null;
  let days: number | null = null;

  // Pattern DD/MM/YYYY or DD-MM-YYYY
  const dateMatches = Array.from(message.matchAll(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/g));
  if (dateMatches.length === 1) {
    const [, d, m, y] = dateMatches[0];
    const parsedEnd = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    if (!isNaN(new Date(parsedEnd).getTime())) {
      endDate = parsedEnd;
      const diff = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000);
      days = Math.max(1, diff);
    }
  } else if (dateMatches.length >= 2) {
    const [, d1, m1, y1] = dateMatches[0];
    const [, d2, m2, y2] = dateMatches[1];
    startDate = `${y1}-${m1.padStart(2, "0")}-${d1.padStart(2, "0")}`;
    endDate = `${y2}-${m2.padStart(2, "0")}-${d2.padStart(2, "0")}`;
    const diff = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000);
    days = Math.max(1, diff);
  }

  const daysMatch = message.match(/\b(\d+)\s*(?:days?|day|يوم|أيام|ايام)\b/i);
  if (daysMatch && !days) {
    days = parseInt(daysMatch[1], 10);
    endDate = new Date(new Date(startDate).getTime() + days * 86400000).toISOString().split("T")[0];
  }

  return { startDate, endDate, days };
}

// Call Multi-Provider AI Brain (Groq -> OpenAI -> Gemini) with full error visibility
async function callSmartAIBrain(
  messagesPayload: { role: "system" | "user" | "assistant"; content: string }[]
): Promise<string | null> {
  // 1. Primary: Groq (ultra-fast inference)
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    const groqModels = ["llama-3.3-70b-versatile", "openai/gpt-oss-120b", "llama-3.1-8b-instant"];
    for (const model of groqModels) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${groqKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: messagesPayload,
            temperature: 0.25,
            max_tokens: 900,
          }),
          signal: AbortSignal.timeout(8000),
        });

        if (res.ok) {
          const json = await res.json();
          const text = json.choices?.[0]?.message?.content?.trim();
          if (text) return text;
        } else {
          const errText = await res.text().catch(() => "");
          console.error(`[AI Brain] Groq (${model}) HTTP ${res.status}:`, errText.slice(0, 200));
        }
      } catch (err: any) {
        console.error(`[AI Brain] Groq (${model}) failed:`, err?.message || err);
      }
    }
  }

  // 2. Fallback: OpenAI
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: messagesPayload,
          temperature: 0.25,
          max_tokens: 900,
          response_format: { type: "json_object" },
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const json = await res.json();
        const text = json.choices?.[0]?.message?.content?.trim();
        if (text) return text;
      } else {
        const errText = await res.text().catch(() => "");
        console.error(`[AI Brain] OpenAI HTTP ${res.status}:`, errText.slice(0, 200));
      }
    } catch (err: any) {
      console.error("[AI Brain] OpenAI failed:", err?.message || err);
    }
  }

  // 3. Fallback: Google Gemini
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const sysMsg = messagesPayload.find((m) => m.role === "system")?.content || "";
    const convContents = messagesPayload
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    for (const model of ["gemini-2.5-flash", "gemini-2.0-flash"]) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...(sysMsg ? { systemInstruction: { parts: [{ text: sysMsg }] } } : {}),
              contents: convContents,
              generationConfig: {
                temperature: 0.25,
                maxOutputTokens: 900,
                responseMimeType: "application/json",
              },
            }),
            signal: AbortSignal.timeout(8000),
          }
        );

        if (res.ok) {
          const json = await res.json();
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (text) return text;
        } else {
          const errText = await res.text().catch(() => "");
          console.error(`[AI Brain] Gemini (${model}) HTTP ${res.status}:`, errText.slice(0, 200));
        }
      } catch (err: any) {
        console.error(`[AI Brain] Gemini (${model}) failed:`, err?.message || err);
      }
    }
  }

  return null;
}

// Short 3s server cache for fleet context: fast burst reuse without stale cars/clients
interface ServerFleetCache {
  timestamp: number;
  allClients: any[];
  allUnits: any[];
  recentContracts: any[];
  totalUnits: number;
  availableUnits: number;
  rentedUnits: number;
  activeContractsCount: number;
}
let serverFleetCache: ServerFleetCache | null = null;

async function getLiveFleetContext() {
  const now = Date.now();
  if (serverFleetCache && now - serverFleetCache.timestamp < 3_000) {
    return serverFleetCache;
  }

  await connectDB();
  const [allClients, allUnits, recentContracts, totalUnits, availableUnits, rentedUnits, activeContractsCount] =
    await Promise.all([
      Client.find().select("name phone customerType status").sort({ updatedAt: -1 }).limit(200).lean(),
      Unit.find().select("make model plate year color dailyRate status").sort({ updatedAt: -1 }).limit(200).lean(),
      Contract.find()
        .select("contractNumber status clientId unitId personalizedPersonName createdAt")
        .sort({ createdAt: -1 })
        .populate("clientId", "name phone")
        .populate("unitId", "make model plate")
        .limit(10)
        .lean(),
      Unit.countDocuments(),
      Unit.countDocuments({ status: "Available" }),
      Unit.countDocuments({ status: "Rented" }),
      Contract.countDocuments({ status: "Active" }),
    ]);

  serverFleetCache = {
    timestamp: now,
    allClients,
    allUnits,
    recentContracts,
    totalUnits,
    availableUnits,
    rentedUnits,
    activeContractsCount,
  };

  return serverFleetCache;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = (body.message || "").trim();
    const lower = message.toLowerCase();
    const history: { sender: string; text: string; action?: string }[] = Array.isArray(body.history) ? body.history : [];
    const pathname: string = typeof body.pathname === "string" ? body.pathname : "";
    const currentSearch: string = typeof body.currentSearch === "string" ? body.currentSearch : "";
    const isArabic = /[\u0600-\u06FF]/.test(message);
    const lang = isArabic ? "ar" : body.lang || "en";

    if (!message) {
      return NextResponse.json<AssistantResponse>({
        reply: lang === "ar" ? "أهلاً بك! كيف أساعدك اليوم؟" : "Hey! How can I assist you today?",
        action: "NONE",
      });
    }

    // =========================================================================
    // FAST PATH: DIRECT UI ACTIONS (Immediate response without LLM lag)
    // =========================================================================
    const lastAssistantText =
      [...history]
        .reverse()
        .find((h) => h.sender !== "user")
        ?.text?.toLowerCase() || "";
    const awaitingConfirmation =
      pathname.startsWith("/bookings/new") ||
      /finalize|confirm|اعتمد|أنشئ|هل أعتمد|which car|أي سيارة|who is the customer|من هو العميل/.test(lastAssistantText);

    if (
      lower.includes("click ") ||
      lower.includes("press ") ||
      lower === "next" ||
      lower === "next step" ||
      lower === "previous step" ||
      lower === "go back" ||
      ((lower === "submit" || lower === "confirm") && !awaitingConfirmation) ||
      message.includes("اضغط") ||
      message === "التالي" ||
      message.includes("الخطوة التالية")
    ) {
      const targetBtn = message
        .replace(/\b(can you|please|click|press|on|the|button|btn)\b/gi, "")
        .replace(/(ممكن|لو سمحت|اضغط|على|زر)/g, "")
        .trim();

      return NextResponse.json<AssistantResponse>({
        reply:
          lang === "ar"
            ? `حاضر! جاري الضغط على (${targetBtn || "الزر"}) الآن...`
            : `Clicking "${targetBtn || "button"}" for you now...`,
        action: "UI_CLICK",
        uiAction: "CLICK_BUTTON",
        uiTarget: targetBtn || "next",
      });
    }

    if (
      lower.includes("add company") ||
      lower.includes("new company") ||
      lower.includes("create company") ||
      lower.includes("add b2b") ||
      message.includes("اضف شركة") ||
      message.includes("إضافة شركة") ||
      message.includes("اضافة شركة") ||
      message.includes("شركة جديدة")
    ) {
      return NextResponse.json<AssistantResponse>({
        reply:
          lang === "ar"
            ? "حاضر! فتحت لك نافذة إضافة شركة جديدة (B2B)."
            : "Sure! Opening the Add Company (B2B) form now.",
        action: "OPEN_ADD_COMPANY_MODAL",
        uiAction: "OPEN_ADD_COMPANY_MODAL",
      });
    }

    if (
      /(?:add|create|creat|new|register)\s+(?:a\s+)?(?:new\s+)?(?:car|vehicle|unit)/i.test(lower) ||
      lower.includes("add car") ||
      lower.includes("add new car") ||
      lower.includes("add vehicle") ||
      lower.includes("add unit") ||
      message.includes("اضف سيارة") ||
      message.includes("إضافة سيارة") ||
      message.includes("اضافة سيارة") ||
      message.includes("سيارة جديدة") ||
      message.includes("اضف مركبة")
    ) {
      return NextResponse.json<AssistantResponse>({
        reply:
          lang === "ar"
            ? "حاضر! فتحت لك نافذة إضافة سيارة جديدة للأسطول."
            : "Opening the Add New Vehicle form now.",
        action: "OPEN_ADD_UNIT_MODAL",
        uiAction: "OPEN_ADD_UNIT_MODAL",
      });
    }

    // Load live context from MongoDB or 30s cache for maximum responsiveness
    const {
      allClients,
      allUnits,
      recentContracts,
      totalUnits,
      availableUnits,
      rentedUnits,
      activeContractsCount,
    } = await getLiveFleetContext();

    // Helpers to find Client and Unit
    const tokensOf = (s: string) =>
      s
        .toLowerCase()
        .split(/[\s,.-]+/)
        .filter((t) => t.length >= 2);

    const findClient = (q?: string | null) => {
      if (!q || q.trim().length < 2) return null;
      const qt = tokensOf(q);
      return (
        (allClients as any[]).find((c) => c.name?.toLowerCase().trim() === q.toLowerCase().trim()) ||
        (allClients as any[]).find((c) => {
          const n = (c.name || "").toLowerCase();
          return qt.length > 0 && qt.every((t) => n.includes(t));
        }) ||
        (allClients as any[]).find((c) => c.phone && q.replace(/\D/g, "").length >= 6 && c.phone.replace(/\D/g, "").includes(q.replace(/\D/g, ""))) ||
        null
      );
    };

    const findUnit = (q?: string | null) => {
      if (!q || q.trim().length < 2) return null;
      const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g, "");
      const qCompact = compact(q);

      // 1. Exact/contained Plate Number match (handles spaces/punctuation variations)
      if (qCompact.length >= 3) {
        const plateMatch = (allUnits as any[]).find((u) => {
          const p = compact(u.plate || "");
          return p.length >= 3 && (qCompact.includes(p) || p === qCompact);
        });
        if (plateMatch) return plateMatch;
      }

      // 2. Token match across make, model, plate, year, color + compact match ("RS Q3" <-> "Rsq3")
      const labelNoise = new Set(["plate", "car", "vehicle", "unit", "select", "selected", "سيارة", "لوحة"]);
      const qt = tokensOf(q).filter((t) => !labelNoise.has(t));
      const tokensToCheck = qt.length > 0 ? qt : tokensOf(q);
      const hay = (u: any) =>
        `${u.make || ""} ${u.model || ""} ${u.plate || ""} ${u.year || ""} ${u.color || ""}`.toLowerCase();
      const hayCompact = (u: any) => compact(hay(u));

      const matches = (allUnits as any[]).filter(
        (u) =>
          tokensToCheck.length > 0 &&
          tokensToCheck.every((t) => hay(u).includes(t) || hayCompact(u).includes(compact(t)))
      );
      return matches.find((u) => u.status === "Available") || matches[0] || null;
    };

    // Existing URL params on /bookings/new
    const existingParams = pathname.startsWith("/bookings/new")
      ? new URLSearchParams(currentSearch)
      : new URLSearchParams();

    const existingClientName = existingParams.get("clientName") ||
      (existingParams.get("clientId") ? (allClients as any[]).find((c) => String(c._id) === existingParams.get("clientId"))?.name : null);
    const existingUnitObj = existingParams.get("unitId")
      ? (allUnits as any[]).find((u) => String(u._id) === existingParams.get("unitId"))
      : null;
    const existingUnitName = existingUnitObj ? `${existingUnitObj.make} ${existingUnitObj.model}` : null;
    const existingType = existingParams.get("contractType") || "Shop";
    const existingDays = existingParams.get("days");
    const existingPrice = existingParams.get("price");

    // Live Summaries for the LLM Brain
    const clientsSummary = allClients
      .slice(0, 60)
      .map((c: any) => `- Name: "${c.name}" | Phone: ${c.phone || "N/A"}`)
      .join("\n");

    const availableUnitsList = (allUnits as any[]).filter((u) => u.status === "Available");
    const unitsSummary = (availableUnitsList.length > 0 ? availableUnitsList : allUnits)
      .slice(0, 60)
      .map((u: any) => `- ${u.make} ${u.model} (${u.year || 2024}) | Plate: ${u.plate} | Status: ${u.status} | Rate: AED ${u.dailyRate || 85}/day`)
      .join("\n");

    const recentContractsSummary = recentContracts
      .slice(0, 8)
      .map(
        (c: any) =>
          `- Contract #${c.contractNumber || "Pending"} | Client: ${(c.clientId as any)?.name || c.personalizedPersonName || "N/A"} | Car: ${(c.unitId as any)?.make || ""} ${(c.unitId as any)?.model || ""} | Status: ${c.status}`
      )
      .join("\n");

    const todayDate = new Date().toISOString().split("T")[0];

    // =========================================================================
    // MASTER SYSTEM PROMPT: HIGH-INTELLIGENCE, PROACTIVE, CONVERSATIONAL
    // =========================================================================
    const systemPrompt = `You are "Leon Assistant", the elite, sharp, and highly intelligent AI operations manager and concierge for Leon Rent A Car in Dubai.
You talk like an expert human manager: friendly, concise, professional, creative, and proactive.
You effortlessly understand English, Arabic (لهجة إماراتية / عربية مهذبة), Franco-Arabic, slang, and typos.
Always respond in the EXACT language the user speaks (Arabic if user speaks Arabic, English if English). Keep responses concise (1 to 2 sentences).

LIVE FLEET & SYSTEM DATA:
Today's Date: ${todayDate}
Fleet Status: ${totalUnits} total cars | ${availableUnits} Available | ${rentedUnits} Rented | ${activeContractsCount} Active Contracts
Recent Clients:
${clientsSummary || "None"}
Available Cars in Fleet:
${unitsSummary || "None"}
Recent Active Contracts:
${recentContractsSummary || "None"}

CURRENT BOOKING CONTEXT IN PROGRESS (from URL/state):
- Client: ${existingClientName || "None selected yet"}
- Car: ${existingUnitName || "None selected yet"}
- Contract Type: ${existingType || "Shop"}
- Duration: ${existingDays ? `${existingDays} day(s)` : "Not specified"}
- Price: ${existingPrice ? `AED ${existingPrice}` : "Default rate"}
- User is on page: ${pathname || "/"}

CRITICAL RULES FOR CONTRACT CREATION & INTERACTIVE DIALOGUE:
When the user wants to create, book, or set up a contract (or says "create contract", "new contract", "سوي عقد", "احجز سيارة"):
1. DO NOT be robotic! DO NOT dump the user on a blank page with generic text!
2. Check what is ALREADY KNOWN from the context above and the user's latest message:
   - Client: Is the client known?
   - Car: Is the vehicle known?
   - Duration / Dates / Time: Are the rental days, start date, or pickup time known?
   - Type: Shop, Delivery, or Personalized?
3. ASK SMART QUESTIONS FOR WHAT IS MISSING:
   - If the user just says "create contract" (no client or car mentioned):
     Warmly ask who the client is!
     English example: "Sure! Let's set up a new contract. Who is the customer for this booking? (Or is it for a new client?)"
     Arabic example: "أكيد! سأجهز لك العقد فوراً. من هو العميل لهذا الحجز؟ (أو هل تريد تسجيل عميل جديد؟)"
   - If the client is known, but the car is missing:
     Acknowledge the client and ask for the vehicle and duration!
     English example: "Got it, for [Client Name]! Which vehicle from our fleet would you like to assign, and for how many days or what dates?"
     Arabic example: "تمام للأخ [اسم العميل]! أي سيارة من الأسطول تحب نحددها، وكم مدة الحجز أو التواريخ؟"
   - If the car is known, but the client is missing:
     Acknowledge the car and ask who the client is!
   - If client, car, and duration are known:
     Summarize clearly and ask if ready to finalize or if it's Personalized / Delivery:
     English example: "Everything is ready: [Car] for [Client] for [Days] days. Shall I go ahead and finalize the contract now?"
     Arabic example: "كل البيانات جاهزة: [السيارة] للأخ [العميل] لمدة [الأيام] أيام. هل أعتمد وأنشئ العقد الآن؟"
   - If the user confirms ("yes", "create it", "confirm", "auto", "نعم", "اعتمد"):
     Confirm with enthusiasm and set readyToSubmit = true!
4. If the user provides multiple pieces of info at once (e.g., "create contract for Khalil with Nissan Patrol for 3 days cash 1500"):
   Extract all of them immediately, DO NOT ask for what they already gave you!
5. If the user asks for suggestions or what cars are available:
   Suggest real available models from the fleet list!
6. VEHICLE FLEET MATCHING & INTEGRITY:
   - Check if the requested vehicle is in our "Available Cars in Fleet" list above.
   - IF THE REQUESTED CAR IS NOT IN OUR FLEET:
     DO NOT invent, pretend, or auto-create a fictitious car!
     Politely explain that this car is not currently in our fleet.
     Present the actual available vehicles in our fleet (e.g., Mercedes-Benz C300).
     Ask if they would like to select one of the available cars, or if they want you to open the "Add Car" form to register a new vehicle into the fleet.
     Keep the customer name and duration in "contractData" so they don't have to repeat them!
   - IF THE CAR IS IN OUR FLEET:
     Assign it immediately in "contractData.carName"!
7. DATES AND DURATION RECOGNITION:
   - When user provides dates like "from today now too 14/11/2026", parse:
     startDate = today's date (${todayDate}),
     endDate = "2026-11-14",
     days = difference in days between startDate and endDate (e.g. 2 days).

OUTPUT FORMAT:
You MUST return ONLY a single valid JSON object (no markdown, no backticks, no code fence). Schema:
{
  "reply": "Your conversational, friendly, human-like response to the user",
  "intent": "CONTRACT_FLOW" | "OPEN_CLIENT_DETAILS" | "OPEN_VEHICLE_DETAILS" | "OPEN_ADD_CLIENT_MODAL" | "NAVIGATE" | "SEARCH_CLIENT" | "SEARCH_VEHICLE" | "FLEET_OVERVIEW" | "GENERAL_CHAT",
  "contractData": {
    "clientName": string | null,
    "carName": string | null,
    "contractType": "Shop" | "Delivery" | "Personalized" | null,
    "days": number | null,
    "startDate": "YYYY-MM-DD" | null,
    "endDate": "YYYY-MM-DD" | null,
    "checkoutTime": string | null,
    "totalPrice": number | null,
    "dailyRate": number | null,
    "deposit": number | null,
    "advancePayment": number | null,
    "paymentMethod": "Cash" | "Card" | "Crypto" | null,
    "pickupLocation": string | null,
    "readyToSubmit": boolean
  },
  "targetUrl": string | null,
  "clientId": string | null,
  "unitId": string | null,
  "searchQuery": string | null
}`;

    const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...history.slice(-12).map((h) => ({
        role: (h.sender === "user" ? "user" : "assistant") as "user" | "assistant",
        content: h.text,
      })),
      { role: "user", content: message },
    ];

    // Deterministic Extraction from Message (guarantees 100% accuracy even if LLM is offline or fails)
    const clientRegex = /(?:\bfor client named\b|\bforclien named\b|\bfor client\b|\bclient named\b|\bcustomer named\b|\bfor customer\b|\bclient\b|\bcustomer\b|العميل|للعميل|لصالح)\s*:?\s*([A-Za-z\u0600-\u06FF\s]{2,45}?)(?=\s+(?:with|and\s+(?:sleect|select)|sleect|select|car|vehicle|بسيارة|سيارة|from|starting|for\s+\d|لمدة|من)|[,.\n]|$)/i;
    const forNameRegex = /\b(?:contract|booking|rent|rental)\s+for\s+([A-Za-z\u0600-\u06FF][A-Za-z\u0600-\u06FF\s]{1,35}?)(?=\s+(?:with|and\s+(?:sleect|select)|sleect|select|car|vehicle|from|starting|for\s+\d)|[,.\n]|$)/i;
    const clientMatch = message.match(clientRegex) || message.match(forNameRegex);
    const rawExtractedClient = clientMatch ? clientMatch[1].trim() : null;
    const reservedClientNoise = /^(new|new\s+client|new\s+clien|clien|client|customer|person|user|someone|any|a|an|the|car|vehicle|today|tomorrow|me|عميل|عميل\s+جديد|جديد|سيارة)$/i;
    const extractedClientName =
      rawExtractedClient && !reservedClientNoise.test(rawExtractedClient) ? rawExtractedClient : null;

    const isFleetQuestion = /\b(how many|list|show|available\s+cars|cars\s+available|all\s+cars|fleet\s+status)\b|كم\s+سيارة|السيارات\s+المتاح/i.test(lower);
    const carRegex = /(?:\bsleect car\b|\bselect car\b|\bwith car\b|\bwith vehicle\b|\bchoose car\b|\bcar\b\s*:?|سيارة|بسيارة|مركبة)\s+([^\n,]+?)(?=\s+(?:from\s+today|from\s+\d|starting|to\s+\d|too\s+\d|until|for\s+\d+\s*(?:day|days|week|month)|من\s+اليوم|لمدة)|[,\n]|$)/i;
    const carMatch = !isFleetQuestion ? message.match(carRegex) : null;
    const rawExtractedCar = carMatch ? carMatch[1].replace(/^:\s*/, "").trim() : null;
    const reservedCarStartNoise = /^(are|is|was|were|available|free|rented|all|many|status|count|should|can|do|does|did|to|the|for|in|on|at)\b/i;
    const extractedCarName =
      rawExtractedCar && rawExtractedCar.length >= 2 && !reservedCarStartNoise.test(rawExtractedCar)
        ? rawExtractedCar
        : null;

    const parsedDates = parseRentalDates(message, todayDate);

    const askedForClient = /who is the customer|who is the client|client name|من هو العميل|اسم العميل/.test(lastAssistantText);
    const askedForCar = /which car|which vehicle|select one of these|select a car|أي سيارة|اختر سيارة|تفضل اختيار واحدة/.test(lastAssistantText);
    const askedForDays = /how many days|duration|كم مدة|كم يوم/.test(lastAssistantText);
    const askedToFinalize = /shall i finalize|create the contract now|هل أعتمد|هل أنشئ العقد/.test(lastAssistantText);

    // Handle direct follow-up when user says "open add car" after Scenario A offered it
    if (
      askedForCar &&
      (/\b(open\s+add\s+car|add\s+car|add\s+it|register\s+it|add\s+new\s+car)\b/i.test(lower) ||
        message.includes("اضافة سيارة") ||
        message.includes("إضافة سيارة") ||
        message.includes("افتح نافذة"))
    ) {
      return NextResponse.json<AssistantResponse>({
        reply:
          lang === "ar"
            ? "حاضر! فتحت لك نافذة إضافة سيارة جديدة للأسطول."
            : "Opening the Add New Vehicle form now.",
        action: "OPEN_ADD_UNIT_MODAL",
        uiAction: "OPEN_ADD_UNIT_MODAL",
      });
    }

    // Call Multi-Provider Smart AI Brain (Groq -> OpenAI -> Gemini)
    const rawBrainOutput = await callSmartAIBrain(chatMessages);
    let parsed: any = null;
    if (rawBrainOutput) {
      try {
        const jsonMatch = rawBrainOutput.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawBrainOutput);
      } catch {
        // LLM returned plain conversational text instead of JSON
      }
    }

    let aiReply = parsed?.reply || (!parsed && rawBrainOutput ? rawBrainOutput : "");
    const intent = parsed?.intent || "GENERAL_CHAT";
    const cData = parsed?.contractData || {};

    if (!cData.clientName && extractedClientName) {
      cData.clientName = extractedClientName;
    } else if (
      !cData.clientName &&
      askedForClient &&
      message.length >= 2 &&
      message.length <= 50 &&
      !reservedClientNoise.test(message) &&
      !/^(yes|no|cancel|ok|confirm|نعم|لا|الغاء|تمام)$/i.test(lower) &&
      !/(contract|car|سيارة|عقد)/.test(lower)
    ) {
      cData.clientName = message.trim();
    }

    if (!cData.carName && extractedCarName) {
      cData.carName = extractedCarName;
    } else if (
      !cData.carName &&
      askedForCar &&
      message.length >= 2 &&
      message.length <= 80 &&
      !/^(yes|no|cancel|ok|نعم|لا|الغاء)$/i.test(lower)
    ) {
      cData.carName = message.trim();
    }

    if (!cData.days && askedForDays) {
      const dm = message.match(/\b(\d{1,3})\b/);
      if (dm) cData.days = parseInt(dm[1], 10);
    }

    if (!cData.endDate && parsedDates.endDate) {
      cData.endDate = parsedDates.endDate;
      cData.startDate = parsedDates.startDate || todayDate;
      cData.days = parsedDates.days;
    } else if (cData.endDate && !cData.startDate) {
      cData.startDate = todayDate;
    }
    if (!cData.days && cData.startDate && cData.endDate) {
      const dDiff = Math.round((new Date(cData.endDate).getTime() - new Date(cData.startDate).getTime()) / 86400000);
      if (dDiff > 0) cData.days = dDiff;
    }

    const isContractRelated =
      intent === "CONTRACT_FLOW" ||
      lower.includes("contract") ||
      lower.includes("contrac") ||
      lower.includes("booking") ||
      lower.includes("rent") ||
      message.includes("عقد") ||
      message.includes("حجز") ||
      pathname.startsWith("/bookings/new") ||
      askedForClient ||
      askedForCar ||
      askedForDays ||
      askedToFinalize ||
      Boolean(cData.clientName || cData.carName || cData.days);

    if (isContractRelated) {
      // 1. Resolve Client
      let resolvedClient: any = null;
      if (cData.clientName) {
        resolvedClient = findClient(cData.clientName);
        if (
          !resolvedClient &&
          cData.clientName.trim().length >= 2 &&
          !reservedClientNoise.test(cData.clientName.trim()) &&
          !/new\s+client|عميل\s+جديد/i.test(cData.clientName)
        ) {
          const newClient = await Client.create({
            name: cData.clientName.trim(),
            phone: "N/A",
            email: "",
            nationality: "UAE",
            idNumber: "N/A",
            licenseNumber: "N/A",
            address: "Dubai",
            clientType: "Resident",
            customerType: "B2C",
            status: "Active",
          });
          resolvedClient = newClient.toObject ? newClient.toObject() : newClient;
          serverFleetCache = null;
        }
      }

      if (!resolvedClient && existingParams.get("clientId")) {
        resolvedClient = (allClients as any[]).find((c) => String(c._id) === existingParams.get("clientId")) || {
          _id: existingParams.get("clientId"),
          name: existingParams.get("clientName") || existingClientName || "Customer",
        };
      }

      // 2. Resolve Vehicle
      let resolvedUnit: any = null;
      let requestedCarNotFound = false;
      const requestedCarName = cData.carName ? cData.carName.trim() : "";

      if (requestedCarName) {
        resolvedUnit = findUnit(requestedCarName);

        if (!resolvedUnit) {
          const parsedCar = parseCarDetails(requestedCarName);

          // Check by plate
          if (parsedCar.plate) {
            const cleanPlate = parsedCar.plate.replace(/\s+/g, "").toLowerCase();
            resolvedUnit = (allUnits as any[]).find(
              (u) => (u.plate || "").replace(/\s+/g, "").toLowerCase() === cleanPlate
            );
          }

          // Check by make + model (only if no explicit plate was specified, to avoid selecting a different car)
          if (!resolvedUnit && !parsedCar.plate && parsedCar.make && parsedCar.model) {
            resolvedUnit = (allUnits as any[]).find(
              (u) =>
                u.make?.toLowerCase() === parsedCar.make.toLowerCase() &&
                u.model?.toLowerCase().includes(parsedCar.model.toLowerCase())
            );
          }
        }

        // If requested car does not exist in our fleet: DO NOT auto-create!
        if (!resolvedUnit && requestedCarName.length >= 2) {
          requestedCarNotFound = true;
        }
      }

      if (!resolvedUnit && !requestedCarNotFound && existingParams.get("unitId")) {
        resolvedUnit = (allUnits as any[]).find((u) => String(u._id) === existingParams.get("unitId")) || null;
      }

      // If user asks for "any car" / "first car" / "auto"
      if (
        !resolvedUnit &&
        (/\b(any\s+car|first\s+car|available\s+car|auto)\b/i.test(lower) ||
          message.includes("اي سيارة") ||
          message.includes("أي سيارة") ||
          message.includes("اول سيارة"))
      ) {
        resolvedUnit = (allUnits as any[]).find((u) => u.status === "Available") || (allUnits as any[])[0] || null;
        requestedCarNotFound = false;
      }

      // 3. Contract Type
      const resolvedType =
        cData.contractType ||
        (existingParams.get("contractType") as "Shop" | "Delivery" | "Personalized") ||
        "Shop";

      const newParams = new URLSearchParams(existingParams.toString());
      newParams.set("contractType", resolvedType);
      newParams.delete("openAddClient");
      newParams.delete("autoPilot");
      newParams.delete("autoSubmit");

      if (resolvedClient) {
        newParams.set("clientId", String(resolvedClient._id));
        if (resolvedClient.name) newParams.set("clientName", String(resolvedClient.name));
      }
      if (cData.days) newParams.set("days", String(cData.days));
      if (cData.startDate) newParams.set("startDate", String(cData.startDate));
      if (cData.endDate) newParams.set("endDate", String(cData.endDate));
      if (cData.checkoutTime) newParams.set("checkoutTime", String(cData.checkoutTime));
      if (cData.totalPrice) newParams.set("price", String(cData.totalPrice));
      if (cData.dailyRate) newParams.set("dailyRate", String(cData.dailyRate));
      if (cData.deposit) newParams.set("deposit", String(cData.deposit));
      if (cData.advancePayment) newParams.set("advance", String(cData.advancePayment));
      if (cData.paymentMethod) newParams.set("paymentMethod", String(cData.paymentMethod));
      if (cData.pickupLocation) newParams.set("pickupLocation", String(cData.pickupLocation));

      const availableCars = (allUnits as any[]).filter((u) => u.status === "Available");
      const availableList = availableCars
        .slice(0, 3)
        .map((u) => `${u.make} ${u.model} (Plate: ${u.plate} - AED ${u.dailyRate || 85}/day)`)
        .join(" | ");
      const availableListAr = availableCars
        .slice(0, 3)
        .map((u) => `${u.make} ${u.model} (لوحة ${u.plate} - ${u.dailyRate || 85} درهم/يوم)`)
        .join("، ");
      const clientLabel = resolvedClient?.name || cData.clientName || "";

      // SCENARIO A: User requested a car that does NOT exist in fleet
      if (requestedCarNotFound) {
        newParams.delete("unitId");
        newParams.delete("autoPilot");

        const smartMissingReply =
          lang === "ar"
            ? `سيارة "${requestedCarName}" غير مسجلة حالياً ضمن أسطولنا. السيارات المتوفرة لدينا الآن: ${availableListAr || "مرسيدس C300"}. هل تفضل اختيار واحدة منها${clientLabel ? ` للعميل ${clientLabel}` : ""}، أم ترغب في فتح نافذة إضافة سيارة جديدة للأسطول؟`
            : `The vehicle "${requestedCarName}" is not registered in our fleet. Available in our fleet right now: ${availableList || "Mercedes-Benz C300"}. Would you like to select one of these${clientLabel ? ` for ${clientLabel}` : ""}, or should I open the Add Car form to register it?`;

        return NextResponse.json<AssistantResponse>({
          reply: smartMissingReply,
          action: "CREATE_CONTRACT",
          navigateUrl: `/bookings/new?${newParams.toString()}`,
        });
      }

      // SCENARIO B: Car exists in fleet but is NOT available (Rented or Maintenance)
      if (resolvedUnit && resolvedUnit.status !== "Available") {
        newParams.delete("unitId");
        const statusAr = resolvedUnit.status === "Rented" ? "مؤجرة حالياً" : "في الصيانة";
        const smartUnavailableReply =
          lang === "ar"
            ? `سيارة ${resolvedUnit.make} ${resolvedUnit.model} مسجلة في أسطولنا ولكنها (${statusAr}). السيارات المتاحة لدينا الآن: ${availableListAr || "مرسيدس C300"}. هل تفضل اختيار واحدة منها؟`
            : `${resolvedUnit.make} ${resolvedUnit.model} is in our fleet but currently ${resolvedUnit.status}. Available cars right now: ${availableList || "Mercedes-Benz C300"}. Would you like to select one of these instead?`;

        return NextResponse.json<AssistantResponse>({
          reply: smartUnavailableReply,
          action: "CREATE_CONTRACT",
          navigateUrl: `/bookings/new?${newParams.toString()}`,
        });
      }

      // SCENARIO C: Car is available in fleet
      if (resolvedUnit) {
        newParams.set("unitId", String(resolvedUnit._id));
        newParams.set("unitName", `${resolvedUnit.make} ${resolvedUnit.model}`);
        newParams.set("unitPlate", resolvedUnit.plate);
      }

      if (/new\s+client|عميل\s+جديد/i.test(message) && !cData.clientName) {
        newParams.set("openAddClient", "true");
      }

      // If user confirms to finalize
      const isConfirmed =
        Boolean(cData.readyToSubmit) ||
        /\b(yes|confirm|submit|create it|submit it|do it|finalize|now|go ahead)\b/i.test(lower) ||
        message.includes("نعم") ||
        message.includes("اعتمد") ||
        message.includes("انشئه") ||
        message.includes("سوه");

      if (resolvedClient && resolvedUnit) {
        newParams.set("autoPilot", "true");
        if (isConfirmed && resolvedType !== "Delivery") {
          newParams.set("autoSubmit", "true");
        }
      }

      // Override aiReply if it is missing, generic, or contradicts resolved backend entities / confirmation
      const replyContradictsResolution =
        (isConfirmed && resolvedClient && resolvedUnit) ||
        (resolvedClient &&
          resolvedUnit &&
          /couldn'?t find|cannot find|not found|tell me the client|غير موجود|لم أجد/i.test(aiReply)) ||
        !aiReply ||
        aiReply.includes("Tell me the client") ||
        aiReply.includes("أخبرني باسم");

      let smartReply = aiReply;
      if (replyContradictsResolution) {
        const effectiveDays = cData.days || (existingDays ? Number(existingDays) : null);
        if (resolvedClient && resolvedUnit) {
          if (isConfirmed) {
            smartReply =
              lang === "ar"
                ? `تم التأكيد! جاري تنفيذ الخطوات خطوة بخطوة واعتماد العقد للعميل ${resolvedClient.name} مع سيارة ${resolvedUnit.make} ${resolvedUnit.model} (${resolvedUnit.plate}) الآن...`
                : `Confirmed! Running all contract steps now for ${resolvedClient.name} with ${resolvedUnit.make} ${resolvedUnit.model} (${resolvedUnit.plate})!`;
          } else if (effectiveDays) {
            smartReply =
              lang === "ar"
                ? `كل البيانات جاهزة: سيارة ${resolvedUnit.make} ${resolvedUnit.model} (${resolvedUnit.plate}) للعميل ${resolvedClient.name} لمدة ${effectiveDays} أيام. هل أعتمد وأنشئ العقد الآن؟`
                : `Everything is set: ${resolvedUnit.make} ${resolvedUnit.model} (${resolvedUnit.plate}) for ${resolvedClient.name} for ${effectiveDays} day(s). Shall I finalize the contract now?`;
          } else {
            smartReply =
              lang === "ar"
                ? `جهزت العقد للعميل ${resolvedClient.name} مع سيارة ${resolvedUnit.make} ${resolvedUnit.model} (${resolvedUnit.plate}). كم يوماً مدة الإيجار، أم أعتمد العقد بيوم واحد مبدئياً؟`
                : `Prepared ${resolvedUnit.make} ${resolvedUnit.model} (${resolvedUnit.plate}) for ${resolvedClient.name}! How many days should the rental be, or should I finalize with the default 1 day?`;
          }
        } else if (resolvedClient && !resolvedUnit) {
          smartReply =
            lang === "ar"
              ? `تمام للأخ ${resolvedClient.name}! السيارات المتوفرة لدينا الآن في الأسطول: ${availableListAr || "لا توجد سيارات متاحة"}. أي سيارة تحب نحددها، وكم مدة الحجز؟`
              : `Got it, for ${resolvedClient.name}! Available vehicles in our fleet: ${availableList || "None currently available"}. Which car would you like to assign and for how many days?`;
        } else if (!resolvedClient && resolvedUnit) {
          smartReply =
            lang === "ar"
              ? `تم اختيار سيارة ${resolvedUnit.make} ${resolvedUnit.model} (${resolvedUnit.plate}). من هو العميل لهذا الحجز؟`
              : `Selected ${resolvedUnit.make} ${resolvedUnit.model} (${resolvedUnit.plate}). Who is the customer for this booking?`;
        } else {
          smartReply =
            lang === "ar"
              ? `أكيد! سأجهز لك العقد فوراً. من هو العميل لهذا الحجز؟ (أو هل تريد تسجيل عميل جديد؟)`
              : `Sure! Let's set up a new contract. Who is the customer for this booking? (Or is it for a new client?)`;
        }
      }

      return NextResponse.json<AssistantResponse>({
        reply: smartReply,
        action: "CREATE_CONTRACT",
        navigateUrl: `/bookings/new?${newParams.toString()}`,
      });
    }

    // =========================================================================
    // 2. OTHER INTELLIGENT INTENTS
    // =========================================================================
    if (intent === "OPEN_ADD_CLIENT_MODAL") {
      return NextResponse.json<AssistantResponse>({
        reply:
          aiReply ||
          (lang === "ar" ? "فتحت لك نافذة إضافة عميل جديد." : "Opening the Add New Client form now."),
        action: "OPEN_ADD_CLIENT_MODAL",
        uiAction: "OPEN_ADD_CLIENT_MODAL",
      });
    }

    if (intent === "OPEN_ADD_UNIT_MODAL") {
      return NextResponse.json<AssistantResponse>({
        reply:
          aiReply ||
          (lang === "ar" ? "فتحت لك نافذة إضافة سيارة جديدة." : "Opening the Add New Vehicle form now."),
        action: "OPEN_ADD_UNIT_MODAL",
        uiAction: "OPEN_ADD_UNIT_MODAL",
      });
    }

    if (intent === "OPEN_CLIENT_DETAILS") {
      const targetClient: any =
        (parsed?.clientId && (allClients as any[]).find((c) => String(c._id) === String(parsed.clientId))) ||
        findClient(parsed?.searchQuery) ||
        (allClients as any[])[0];

      if (targetClient) {
        return NextResponse.json<AssistantResponse>({
          reply:
            aiReply ||
            (lang === "ar" ? `عرض ملف العميل ${targetClient.name}.` : `Opening profile for ${targetClient.name}.`),
          action: "NAVIGATE",
          navigateUrl: `/clients/${targetClient._id}`,
          data: { type: "clients", items: [targetClient] },
        });
      }
    }

    if (intent === "OPEN_VEHICLE_DETAILS") {
      const targetUnit: any =
        (parsed?.unitId && (allUnits as any[]).find((u) => String(u._id) === String(parsed.unitId))) ||
        findUnit(parsed?.searchQuery) ||
        (allUnits as any[])[0];

      if (targetUnit) {
        return NextResponse.json<AssistantResponse>({
          reply:
            aiReply ||
            (lang === "ar"
              ? `عرض تفاصيل ${targetUnit.make} ${targetUnit.model}.`
              : `Opening details for ${targetUnit.make} ${targetUnit.model}.`),
          action: "NAVIGATE",
          navigateUrl: `/units/${targetUnit._id}`,
          data: { type: "vehicles", items: [targetUnit] },
        });
      }
    }

    if (intent === "NAVIGATE" && parsed?.targetUrl) {
      return NextResponse.json<AssistantResponse>({
        reply: aiReply || (lang === "ar" ? "جاري الانتقال الآن..." : "Navigating now..."),
        action: "NAVIGATE",
        navigateUrl: parsed.targetUrl,
      });
    }

    if (intent === "FLEET_OVERVIEW" || (!parsed && /\b(fleet|available|cars|stats|overview|how many)\b|السيارات|المتاح|الأسطول|كم سيارة/i.test(lower))) {
      return NextResponse.json<AssistantResponse>({
        reply:
          aiReply ||
          (lang === "ar"
            ? `لديك حالياً ${availableUnits} سيارة متاحة من أصل ${totalUnits}، و${rentedUnits} مؤجرة مع ${activeContractsCount} عقد نشط.`
            : `We currently have ${availableUnits} available cars out of ${totalUnits} total, with ${rentedUnits} rented and ${activeContractsCount} active contracts.`),
        action: "OVERVIEW",
        data: {
          type: "overview",
          stats: {
            totalUnits,
            availableUnits,
            rentedUnits,
            activeContracts: activeContractsCount,
          },
        },
      });
    }

    if (intent === "SEARCH_CLIENT") {
      const q = (parsed?.searchQuery || "").toLowerCase();
      const matched = (allClients as any[])
        .filter((c) => !q || c.name?.toLowerCase().includes(q) || c.phone?.includes(q))
        .slice(0, 4);

      return NextResponse.json<AssistantResponse>({
        reply: aiReply || (lang === "ar" ? "نتائج البحث عن العملاء:" : "Here are the matching clients:"),
        action: "SEARCH_RESULT",
        data: {
          type: "clients",
          items: matched.map((c) => ({
            id: c._id,
            name: c.name,
            phone: c.phone || "N/A",
          })),
        },
      });
    }

    if (intent === "SEARCH_VEHICLE") {
      const q = (parsed?.searchQuery || "").toLowerCase();
      const matched = (allUnits as any[])
        .filter((u) => !q || u.make?.toLowerCase().includes(q) || u.model?.toLowerCase().includes(q) || u.plate?.toLowerCase().includes(q))
        .slice(0, 4);

      return NextResponse.json<AssistantResponse>({
        reply: aiReply || (lang === "ar" ? "نتائج البحث في الأسطول:" : "Here are the matching fleet vehicles:"),
        action: "SEARCH_RESULT",
        data: {
          type: "vehicles",
          items: matched.map((u) => ({
            id: u._id,
            title: `${u.make} ${u.model}`,
            plate: u.plate,
            status: u.status,
          })),
        },
      });
    }

    // Deterministic navigation fallback if AI provider didn't respond
    if (!parsed) {
      const navMap: { pattern: RegExp; url: string; labelEn: string; labelAr: string }[] = [
        { pattern: /\b(dashboard|home)\b|الرئيسية|الداشبورد/i, url: "/", labelEn: "Opening Dashboard.", labelAr: "فتحت لك لوحة التحكم." },
        { pattern: /\b(bookings|contracts)\b|العقود|الحجوزات/i, url: "/bookings", labelEn: "Opening Contracts.", labelAr: "فتحت لك صفحة العقود." },
        { pattern: /\b(clients|customers)\b|العملاء/i, url: "/clients", labelEn: "Opening Clients.", labelAr: "فتحت لك صفحة العملاء." },
        { pattern: /\b(units|vehicles)\b|المركبات|الوحدات/i, url: "/units", labelEn: "Opening Vehicles.", labelAr: "فتحت لك صفحة السيارات." },
        { pattern: /\b(calendar)\b|التقويم/i, url: "/calendar", labelEn: "Opening Calendar.", labelAr: "فتحت لك التقويم." },
        { pattern: /\b(reports|analytics)\b|التقارير/i, url: "/reports", labelEn: "Opening Reports.", labelAr: "فتحت لك التقارير." },
      ];
      for (const nav of navMap) {
        if (nav.pattern.test(message)) {
          return NextResponse.json<AssistantResponse>({
            reply: lang === "ar" ? nav.labelAr : nav.labelEn,
            action: "NAVIGATE",
            navigateUrl: nav.url,
          });
        }
      }
    }

    return NextResponse.json<AssistantResponse>({
      reply:
        aiReply ||
        (lang === "ar"
          ? `أهلاً بك! لدينا ${availableUnits} سيارة متاحة الآن. أخبرني بما تريد فعله (إنشاء عقد، البحث عن عميل أو سيارة، أو عرض ملخص الأسطول).`
          : `How can I help? We currently have ${availableUnits} available cars. Ask me to create a contract, search clients/vehicles, or check fleet status.`),
      action: "NONE",
    });
  } catch (error: any) {
    console.error("AI Assistant API error:", error);
    return NextResponse.json(
      {
        reply: "Something went wrong, please try again.",
        action: "NONE",
      },
      { status: 500 }
    );
  }
}
