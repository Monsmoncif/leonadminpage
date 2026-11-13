export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { Client } from "@/models/Client";
import { Unit } from "@/models/Unit";
import {
  LEON_BACKEND_KNOWLEDGE,
  BackendQuerySpec,
  executeBackendQuery,
  getRichBackendContext,
  invalidateBackendContextCache,
} from "@/lib/assistant-backend";

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
  let isKnownMake = false;

  for (const b of knownBrands) {
    const isAscii = /^[A-Za-z0-9\s-]+$/.test(b);
    const rx = isAscii ? new RegExp(`\\b${b}\\b`, "i") : new RegExp(b, "i");
    const m = text.match(rx);
    if (m && m.index !== undefined) {
      isKnownMake = true;
      make = b;
      model = text.slice(m.index + m[0].length).trim();
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

  return { make, model, year, color, plate, isKnownMake };
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

// Call Multi-Provider AI Brain (Groq active models -> OpenAI -> Gemini) with full error visibility
async function callSmartAIBrain(
  messagesPayload: { role: "system" | "user" | "assistant"; content: string }[],
  options: { jsonMode?: boolean; maxTokens?: number } = {}
): Promise<string | null> {
  const jsonMode = options.jsonMode !== false;
  const maxTokens = options.maxTokens ?? 1000;

  // 1. Primary: Groq (benchmark-verified models on active key)
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    const groqConfigs: { model: string; extra: Record<string, any> }[] = [
      {
        model: "openai/gpt-oss-120b",
        extra: {
          reasoning_effort: "low",
          ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
        },
      },
      {
        model: "qwen/qwen3.8-27b",
        extra: {
          ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
        },
      },
      {
        model: "openai/gpt-oss-20b",
        extra: {
          reasoning_effort: "low",
          ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
        },
      },
    ];

    for (const { model, extra } of groqConfigs) {
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
            max_tokens: maxTokens,
            ...extra,
          }),
          signal: AbortSignal.timeout(9000),
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
          max_tokens: maxTokens,
          ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
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
                maxOutputTokens: maxTokens,
                ...(jsonMode ? { responseMimeType: "application/json" } : {}),
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
    const lastAssistantMsgObj = [...history].reverse().find((h) => h.sender !== "user");
    const lastAssistantText = lastAssistantMsgObj?.text?.toLowerCase() || "";
    const lastWasContractAction = lastAssistantMsgObj?.action === "CREATE_CONTRACT";
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

    // Load complete live backend context (all KPIs, fleet, contracts, clients, drivers, damages, inspections, transactions, logs, alerts)
    const backendCtx = await getRichBackendContext();
    const {
      allClients,
      allUnits,
      recentContracts,
      totalUnits,
      availableUnits,
      rentedUnits,
      maintenanceUnits,
      activeContractsCount,
      kpis,
    } = backendCtx;

    // Helpers to find Client and Unit with scored matching (NEVER guess random fallback [0])
    const tokensOf = (s: string) =>
      s
        .toLowerCase()
        .split(/[\s,.\-•|/\\:()]+/)
        .filter((t) => t.length >= 2);

    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const clientNoiseWords = new Set([
      "open", "toopen", "show", "view", "get", "find", "search", "details", "detail",
      "profile", "page", "client", "clinet", "customer", "of", "for", "named", "name",
      "the", "about", "please", "me", "check", "look", "up", "so", "what", "need", "want",
      "is", "to", "hi", "hello", "hey", "halo", "yo", "salam", "thanks", "thank", "ok", "okay",
      "can", "you", "give", "this", "that", "good", "nice", "great", "man", "bro", "sir",
      "stupid", "tupid", "bad", "help",
      "افتح", "عرض", "ملف", "تفاصيل", "صفحة", "العميل", "عميل", "عن", "ابحث",
      "مرحبا", "اهلا", "أهلا", "شكرا", "تمام",
    ]);

    const cleanClientQuery = (q?: string | null) => {
      if (!q) return "";
      return tokensOf(q)
        .filter((t) => !clientNoiseWords.has(t))
        .join(" ")
        .trim();
    };

    const scoreClientList = (clientsList: any[], q?: string | null) => {
      if (!q || q.trim().length < 2) return [];
      const cleaned = cleanClientQuery(q);
      const effectiveQ = cleaned;
      if (!effectiveQ) return [];
      const qt = tokensOf(effectiveQ);
      const qDigits = q.replace(/\D/g, "");

      const scored: { client: any; score: number }[] = [];
      for (const c of clientsList) {
        const cNameRaw = (c.name || "").toLowerCase().trim();
        const ct = tokensOf(cNameRaw);
        const cDigits = (c.phone || "").replace(/\D/g, "");

        let score = 0;
        if (cNameRaw && cNameRaw === effectiveQ) {
          score = 1000;
        } else if (qDigits.length >= 6 && cDigits.includes(qDigits)) {
          score = 900;
        } else if (
          qt.length > 0 &&
          qt.every((t) => (t.length <= 2 ? ct.includes(t) : cNameRaw.includes(t)))
        ) {
          score = 500 + qt.length * 20;
        } else if (ct.length >= 2 && qt.length >= 2 && ct.every((t) => qt.some((qtTok) => qtTok === t || (qtTok.length >= 3 && t.includes(qtTok))))) {
          // Bidirectional: DB client name ("ourci ahmed") is a full subset of longer query ("ourci ahmed mouncif")
          score = 420 + ct.length * 20;
        } else if (qt.length > 0 && ct.length > 0) {
          let overlap = 0;
          for (const t of qt) {
            if (ct.some((ctTok) => ctTok === t || (t.length >= 3 && ctTok.includes(t)) || (ctTok.length >= 3 && t.includes(ctTok)))) {
              overlap++;
            }
          }
          if (overlap >= 2 || (qt.length === 1 && overlap === 1)) {
            score = overlap * 120 + (overlap === ct.length ? 40 : 0);
          }
        }

        if (score > 0) scored.push({ client: c, score });
      }

      scored.sort((a, b) => b.score - a.score);
      return scored;
    };

    const findClientMatches = async (q?: string | null) => {
      if (!q || q.trim().length < 2) return [];
      let scored = scoreClientList(allClients as any[], q);

      // Direct DB fallback if not in cached top 500
      if (scored.length === 0) {
        const cleaned = cleanClientQuery(q);
        const qt = tokensOf(cleaned).filter((t) => t.length >= 2);
        if (qt.length > 0) {
          const dbMatches = await Client.find({
            $or: qt.map((t) => ({ name: { $regex: escapeRegex(t), $options: "i" } })),
          })
            .select("name phone customerType status")
            .limit(20)
            .lean();
          if (dbMatches.length > 0) {
            scored = scoreClientList(dbMatches as any[], q);
          }
        }
      }
      return scored;
    };

    const findClient = (q?: string | null) => {
      const scored = scoreClientList(allClients as any[], q);
      if (scored.length === 0) return null;
      if (scored[0].score >= 420) return scored[0].client;
      if (scored.length === 1 || scored[0].score > scored[1].score + 50) return scored[0].client;
      return scored[0].client;
    };

    const isEditDistAtMostOne = (a: string, b: string) => {
      if (a === b) return true;
      if (Math.abs(a.length - b.length) > 1) return false;
      let i = 0;
      let j = 0;
      let edits = 0;
      while (i < a.length && j < b.length) {
        if (a[i] === b[j]) {
          i++;
          j++;
        } else {
          edits++;
          if (edits > 1) return false;
          if (a.length > b.length) i++;
          else if (b.length > a.length) j++;
          else {
            i++;
            j++;
          }
        }
      }
      if (i < a.length || j < b.length) edits++;
      return edits <= 1;
    };

    const detectRequestedUnitStatus = (rawQ: string): "Available" | "Rented" | "Maintenance" | null => {
      const qL = rawQ.toLowerCase();
      if (/\b(rented|hired|booked|occupied)\b|مستأجر|مستأجرة|مؤجر|مؤجرة|مشغول|مشغولة/i.test(qL)) return "Rented";
      if (/\b(maintenance|repair|workshop|broken|service)\b|صيانة|ورشة|عطلان/i.test(qL)) return "Maintenance";
      if (/\b(available|availb\w*|avalab\w*|avialab\w*|avaliab\w*|free|ready|dispo|disponible)\b|متاح|متاحة|متوفر|متوفرة|فاضي|فاضية|جاهز|جاهزة/i.test(qL)) {
        return "Available";
      }
      for (const tok of tokensOf(qL)) {
        if (tok.length >= 6 && (isEditDistAtMostOne(tok, "available") || isEditDistAtMostOne(tok, "avaliable") || isEditDistAtMostOne(tok, "availble"))) {
          return "Available";
        }
      }
      return null;
    };

    const findUnitMatches = (q?: string | null) => {
      const requestedStatus = q ? detectRequestedUnitStatus(q) : null;
      if (!q || q.trim().length < 2) {
        return {
          matches: [] as any[],
          baseMatches: [] as any[],
          brandMatchesCount: 0,
          requestedStatus,
          hasExplicitPlate: false,
          isBrandOnly: false,
          matchedMakeOrModelOrPlate: false,
        };
      }
      const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g, "");
      const qCompact = compact(q);
      const parsedDetails = parseCarDetails(q);
      const hasExplicitPlate = Boolean(parsedDetails.plate);

      // 1. Exact/contained Plate Number match (strongest identifier; ignore short conversational words)
      if (qCompact.length >= 3 && !/^[a-z]+$/.test(qCompact)) {
        const plateMatches = (allUnits as any[]).filter((u) => {
          const p = compact(u.plate || "");
          return p.length >= 3 && (qCompact.includes(p) || p === qCompact);
        });
        if (plateMatches.length > 0) {
          return {
            matches: plateMatches,
            baseMatches: plateMatches,
            brandMatchesCount: plateMatches.length,
            requestedStatus,
            hasExplicitPlate: true,
            isBrandOnly: false,
            matchedMakeOrModelOrPlate: true,
          };
        }
      }

      // 2. Word-boundary & safe compound/fuzzy token match (strips status/filter typos like "availbale" & prevents "hi" substring hits)
      const labelNoise = new Set([
        "plate", "car", "cars", "vehicle", "vehicles", "unit", "units", "model", "models",
        "select", "sleect", "selected", "open", "toopen", "show", "view", "details", "detail",
        "page", "profile", "find", "search", "check", "list", "give", "any", "all", "do", "have",
        "of", "for", "the", "about", "please", "with", "so", "what", "which", "need", "want", "is",
        "are", "was", "were", "this", "that", "these", "those", "my", "your", "our", "can", "you", "me",
        "available", "availbale", "avalable", "avaliable", "availble", "avialable", "free", "ready",
        "rented", "hired", "booked", "maintenance", "repair", "out", "service",
        "hi", "hello", "hey", "halo", "yo", "salam", "marhaba", "ahlan", "thanks", "thank", "thx",
        "ok", "okay", "yes", "no", "good", "bad", "nice", "great", "stupid", "tupid", "man", "bro", "sir", "help", "test",
        "سيارة", "سيارات", "مركبة", "مركبات", "لوحة", "تفاصيل", "افتح", "عرض", "كل", "قائمة",
        "متاح", "متاحة", "متوفر", "متوفرة", "فاضية", "مستأجر", "مستأجرة", "مؤجر", "مؤجرة", "صيانة",
        "مرحبا", "اهلا", "أهلا", "شكرا", "تمام",
      ]);
      const isAvailabilityNoiseToken = (t: string) =>
        labelNoise.has(t) ||
        Boolean(detectRequestedUnitStatus(t)) ||
        (t.length >= 6 && (isEditDistAtMostOne(t, "available") || isEditDistAtMostOne(t, "availble")));
      const qt = tokensOf(q).filter((t) => !isAvailabilityNoiseToken(t));
      if (qt.length === 0) {
        if (requestedStatus) {
          const statusMatches = (allUnits as any[]).filter((u) => u.status === requestedStatus);
          return {
            matches: statusMatches,
            baseMatches: statusMatches,
            brandMatchesCount: statusMatches.length,
            requestedStatus,
            hasExplicitPlate: false,
            isBrandOnly: false,
            matchedMakeOrModelOrPlate: false,
          };
        }
        return {
          matches: [] as any[],
          baseMatches: [] as any[],
          brandMatchesCount: 0,
          requestedStatus,
          hasExplicitPlate,
          isBrandOnly: false,
          matchedMakeOrModelOrPlate: false,
        };
      }

      const isBrandOnly = !hasExplicitPlate && qt.length <= 1;
      const wordsOf = (s: string) =>
        s
          .toLowerCase()
          .split(/[\s,.\-•|/\\:()]+/)
          .filter((w) => w.length > 0);
      const tokenMatchesText = (words: string[], textCompact: string, tok: string) => {
        const tc = compact(tok);
        if (!tc) return false;
        if (tc.length <= 2) {
          return words.some((w) => w === tok || compact(w) === tc);
        }
        if (tc.length === 3) {
          return words.some((w) => w === tok || w.startsWith(tok) || compact(w) === tc || compact(w).startsWith(tc));
        }
        if (words.some((w) => w.includes(tok)) || textCompact.includes(tc)) {
          return true;
        }
        if (tc.length >= 5) {
          return words.some((w) => {
            const wc = compact(w);
            return wc.length >= 5 && isEditDistAtMostOne(wc, tc);
          });
        }
        return false;
      };

      const hay = (u: any) =>
        `${u.make || ""} ${u.model || ""} ${u.plate || ""} ${u.year || ""} ${u.color || ""}`.toLowerCase();
      const identityHay = (u: any) => `${u.make || ""} ${u.model || ""} ${u.plate || ""}`.toLowerCase();

      const exactMatches = (allUnits as any[]).filter((u) => {
        const hw = wordsOf(hay(u));
        const hc = compact(hay(u));
        return qt.every((t) => tokenMatchesText(hw, hc, t));
      });

      // If strict token match fails on extra words/color/year when user didn't give a plate, match any identity token in make/model
      let baseMatches = exactMatches;
      if (baseMatches.length === 0 && !hasExplicitPlate && qt.length >= 2) {
        baseMatches = (allUnits as any[]).filter((u) => {
          const uMakeModel = `${u.make || ""} ${u.model || ""}`.toLowerCase();
          const mw = wordsOf(uMakeModel);
          const mc = compact(uMakeModel);
          return qt.some((t) => tokenMatchesText(mw, mc, t));
        });
      }

      const brandMatchesCount = baseMatches.length;
      const matches = requestedStatus
        ? baseMatches.filter((u) => String(u.status || "").toLowerCase() === requestedStatus.toLowerCase())
        : baseMatches;

      const matchedMakeOrModelOrPlate =
        baseMatches.length > 0 &&
        baseMatches.some((u) => {
          const iw = wordsOf(identityHay(u));
          const ic = compact(identityHay(u));
          return qt.some((t) => tokenMatchesText(iw, ic, t));
        });

      return { matches, baseMatches, brandMatchesCount, requestedStatus, hasExplicitPlate, isBrandOnly, matchedMakeOrModelOrPlate };
    };

    const findUnit = (q?: string | null) => {
      const { matches } = findUnitMatches(q);
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

    const todayDate = new Date().toISOString().split("T")[0];

    // =========================================================================
    // MASTER SYSTEM PROMPT: BACKEND-TRAINED OPERATIONS MANAGER & Q&A ENGINE
    // =========================================================================
    const systemPrompt = `You are "Leon Assistant", the AI operations manager for Leon Rent A Car (Dubai).
AUTHORIZATION: User IS the authenticated company Admin/Owner querying their own MongoDB backend. Never refuse company data queries (clients, rentals, revenue, fleet, drivers, damages, logs); answer accurately from the verified data below in the user's exact language (Arabic/English/Franco-Arabic).
STYLE: Analytical/backend Qs -> complete bullet/line answer with exact names, #numbers, plates, dates, AED (ALWAYS format money in AED, never $ or USD). Actions/booking -> concise 1-2 sentences. Understand typos ("availbale", "clinet", "contrac"), slang, Arabic dialects, and Franco-Arabic effortlessly.

${LEON_BACKEND_KNOWLEDGE}

${backendCtx.executivePromptContext}

BOOKING STATE: Client=${existingClientName || "None"}, Car=${existingUnitName || "None"}, Type=${existingType || "Shop"}, Days=${existingDays || "?"}, Price=${existingPrice || "Default"}, Page=${pathname || "/"}

RULES:
1. BACKEND Q&A & FULL ACCESS: You have complete read access to every collection in MongoDB (fleet, clients, contracts, drivers, damages, inspections, transactions, logs, expiries, revenue). Answer directly from LIVE METRICS/lists above when complete. When user asks for specific/filtered cars, older clients, full history/vidange/inspections, date-range revenue/transactions, contracts, logs, drivers, or expiries not fully shown above, set "intent":"QUERY_BACKEND" with "backendQuery".
2. FLEET AVAILABILITY & FILTERING: If user asks for available/rented/maintenance/cheapest/specific cars (e.g. "availbale mercedes", "free bmw", "rented urus", "black cars under 500"), set "intent":"GENERAL_CHAT" (or "QUERY_BACKEND" "fleet_query" if fleet > 100), list ALL matching cars with plate, year, color, status & AED rate, and set "searchQuery" + optional "filterStatus" so clickable car cards appear. NEVER ask for plate number on availability/filter questions!
3. CONTRACT WIZARD: Only set "intent":"CONTRACT_FLOW" when user wants to CREATE/BOOK/SET UP a new contract (NOT questions like "how many contracts", "rental history", "overdue contracts"). Never invent missing cars; ask plate/year/color when selecting a bare/ambiguous car.
4. ENTITY INTEGRITY: Use "OPEN_CLIENT_DETAILS"/"OPEN_VEHICLE_DETAILS"/"NAVIGATE" only when user asks to open/go to a page or types ONLY a bare entity name, NEVER to hijack analytical/availability questions. Put queried name/plate in "searchQuery"; never guess IDs.

Return ONLY valid JSON:
{
  "reply": "string",
  "intent": "QUERY_BACKEND" | "CONTRACT_FLOW" | "OPEN_CLIENT_DETAILS" | "OPEN_VEHICLE_DETAILS" | "OPEN_ADD_CLIENT_MODAL" | "OPEN_ADD_UNIT_MODAL" | "NAVIGATE" | "SEARCH_CLIENT" | "SEARCH_VEHICLE" | "FLEET_OVERVIEW" | "GENERAL_CHAT",
  "backendQuery": { "queryType": "fleet_query"|"clients_query"|"client_profile"|"vehicle_profile"|"contracts_query"|"transactions_query"|"damages_query"|"inspections_query"|"logs_query"|"drivers_query"|"expiries_check"|"revenue_summary", "search": string|null, "status": string|null, "dateFrom": "YYYY-MM-DD"|null, "dateTo": "YYYY-MM-DD"|null, "limit": number|null } | null,
  "contractData": { "clientName": string|null, "carName": string|null, "contractType": "Shop"|"Delivery"|"Personalized"|null, "days": number|null, "startDate": "YYYY-MM-DD"|null, "endDate": "YYYY-MM-DD"|null, "checkoutTime": string|null, "totalPrice": number|null, "dailyRate": number|null, "deposit": number|null, "advancePayment": number|null, "paymentMethod": "Cash"|"Card"|"Crypto"|null, "pickupLocation": string|null, "readyToSubmit": boolean },
  "targetUrl": string | null,
  "clientId": string | null,
  "unitId": string | null,
  "searchQuery": string | null,
  "filterStatus": "Available" | "Rented" | "Maintenance" | null
}`;

    const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...history.slice(-8).map((h) => ({
        role: (h.sender === "user" ? "user" : "assistant") as "user" | "assistant",
        content: h.text,
      })),
      { role: "user", content: message },
    ];

    // Deterministic Extraction & Question vs Action Classification
    const detectedQueryStatus = detectRequestedUnitStatus(message);
    const hasAvailabilityOrFilterWords =
      Boolean(detectedQueryStatus) ||
      /\b(availab\w*|availb\w*|avalab\w*|avialab\w*|avaliab\w*|free|ready|rented|booked|maintenance|repair|cheapest|most\s+expensive)\b|متاح|متاحة|متوفر|متوفرة|مستأجر|مستأجرة|فاضي|فاضية|صيانة|أرخص|ارخص|أغلى|اغلى/i.test(
        lower
      );

    const isAnalyticalQuestion =
      /[?؟]$/.test(message.trim()) ||
      Boolean(detectedQueryStatus) ||
      /\b(who|what|when|where|why|how|which|whom|whose|does|did|do|can|could|tell\s+me|give\s+me|show\s+me|explain|summarize|summary|report|revenue|profit|income|expense|earning|money|overdue|late|unpaid|pending|balance|deposit|damage|damages|inspection|inspections|oil|vidange|mileage|km|insurance|registration|expiry|expired|expire|driver|drivers|log|logs|activity|notification|notifications|alert|alerts|history|spending|spent|total\s+spent|status\s+of|all\s+contracts|past\s+contracts|rental\s+history|rate|price|cost|last\s+time|who\s+rented|how\s+many|how\s+much|workflow|availab\w*|availb\w*|avalab\w*|cheapest|expensive)\b/i.test(
        lower
      ) ||
      /(?:^|\s)(كم|من\s|منو|مين|متى|وين|أين|اين|ليش|لماذا|هل|ما\s+هي|ما\s+هو|ماهي|ماهو|شو|ايش|وش|احسب|لخص|عطني|خبرني|قول\s+لي|اشرح|تقارير|ارباح|أرباح|دخل|مصاريف|فواتير|متأخر|تأخير|أضرار|اضرار|صيانة|الزيت|فيدانج|رخصة|تأمين|سائق|سائقين|تنبيهات|اشعارات|إشعارات|سجل|ملخص|سعر|كيف|غير\s+مدفوع|متاح|متاحة|متوفر|متوفرة|مستأجرة)/.test(
        message
      );

    const explicitNavigateToEntity =
      /\b(open|toopen|to\s*open|go\s*to)\b.*(?:\bpage\b|\bdetails?\b|\bprofile\b|\bcar\b|\bvehicle\b|\bunit\b|\bclient\b|\bcustomer\b)|(?:\bdetails?\b|\bprofile\b|\bpage\b)\s+(?:of|for)\b|افتح\s+(?:صفحة|ملف|تفاصيل)/i.test(
        lower
      ) && !/\b(history|contracts|spent|spending|overdue|damages)\b|تاريخ|سجل|عقود|متأخر/i.test(lower);

    const isGreetingOrSmallTalk =
      /^\s*(?:hi+|hello+|hey+|halo+|yo+|hola|bonjour|salut|good\s*(?:morning|afternoon|evening|night)|morning|evening|salam|salaam|as[-\s]*salamu?\s*alaikum|marhaba|ahlan|labas|kifak|thanks?|thank\s*you|thx|ty|ok|okay|k|cool|nice|great|awesome|fine|bye|goodbye|test|help|who\s*are\s*you|what\s*can\s*you\s*do|how\s*are\s*you|sup|what'?s\s*up|مرحبا+|أهلا+|اهلا+|السلام\s*عليكم|وعليكم\s*السلام|صباح\s*الخير|مساء\s*الخير|كيف\s*حالك|كيفك|شلونك|اخبارك|أخبارك|لباس|لاباس|شكرا+|شكراً|مشكور|تمام|اوك|أوك|حسناً|طيب|يعطيك\s*العافية|مساعدة|من\s*أنت)[\s!?.؟،,]*$/i.test(
        lower
      );

    const isCreatingContractPhrase =
      /\b(create|make|setup|set\s+up|start|draft|prepare|book|reserve|forclien|with\s+car|sleect\s+car|select\s+car)\b|\b(?:new|add(?:\s+a)?)\s+(?:contract|booking|rental)\b|انشاء|إنشاء|سوي|سويلي|اعمل|جهز|احجز|عقد\s+جديد|حجز\s+جديد/i.test(
        lower
      );

    const isHowToQuestion =
      /^\s*(?:how\s+(?:do|can|does|to|should)|what\s+(?:is|are|does)|why\s+|explain\b|كيف\s+|ما\s+هو\s+|اشرح)/i.test(
        lower
      ) && !/\b(?:for\s+client|forclien|with\s+car|from\s+today)\b/i.test(lower);

    const hasContractWords =
      /\b(contract|contrac|booking|rent|rental|reserve)\b|عقد|حجز|تأجير|استئجار/i.test(lower) &&
      !isHowToQuestion &&
      (isCreatingContractPhrase || !isAnalyticalQuestion);

    const mentionsFleetDomain =
      parseCarDetails(message).isKnownMake ||
      Boolean(parseCarDetails(message).plate) ||
      Boolean(detectedQueryStatus) ||
      /\b(car|cars|vehicle|vehicles|unit|units|fleet|suv|sedan|supercar)\b|سيارة|سيارات|مركبة|الأسطول|اسطول/i.test(lower);
    const mentionsNonFleetDomain =
      /\b(revenue|profit|earning|income|overdue|unpaid|balance|damage|damages|client|clients|customer|customers|driver|drivers|inspection|inspections|log|logs|contract|contracts|booking|bookings)\b|عقد|عقود|أرباح|ارباح|إيرادات|متأخر|أضرار|اضرار|عميل|عملاء|سائق/i.test(
        lower
      );
    const isFleetFilterQuery =
      !hasContractWords &&
      !isCreatingContractPhrase &&
      !explicitNavigateToEntity &&
      hasAvailabilityOrFilterWords &&
      mentionsFleetDomain &&
      (!mentionsNonFleetDomain || Boolean(detectedQueryStatus) || parseCarDetails(message).isKnownMake);

    const wantsClientDetails =
      !hasContractWords &&
      !isFleetFilterQuery &&
      (explicitNavigateToEntity || !isAnalyticalQuestion) &&
      (/(?:\bopen\b|\btoopen\b|\bto\s*open\b|\bshow\b|\bview\b|\bfind\b|\bsearch\b|\bdetails\b|\bdetail\b|\bprofile\b|\bpage\b).*(?:\bclient\b|\bclinet\b|\bcustomer\b)|(?:\bclient\b|\bclinet\b|\bcustomer\b).*(?:\bdetails\b|\bdetail\b|\bprofile\b|\bpage\b)|(?:افتح|عرض|تفاصيل|ملف).*(?:عميل|العميل|زبون)/i.test(
        lower
      ));

    const wantsVehicleDetails =
      !hasContractWords &&
      !isFleetFilterQuery &&
      !/\b(add\s+car|add\s+new\s+car|new\s+car|add\s+vehicle|create\s+car)\b|اضافة\s+سيارة|إضافة\s+سيارة/i.test(lower) &&
      (explicitNavigateToEntity || !isAnalyticalQuestion) &&
      (/(?:\bopen\b|\btoopen\b|\bto\s*open\b|\bshow\b|\bview\b|\bfind\b|\bsearch\b|\bcheck\b|\bdetails\b|\bdetail\b|\bprofile\b|\bpage\b).*(?:\bcar\b|\bvehicle\b|\bunit\b)|(?:\bcar\b|\bvehicle\b|\bunit\b).*(?:\bdetails\b|\bdetail\b|\bprofile\b|\bpage\b)|(?:افتح|عرض|تفاصيل|فحص).*(?:سيارة|السيارة|مركبة)/i.test(
        lower
      ));

    const explicitClientDetailMatch =
      message.match(/\b(?:details?|profile|page)\s+(?:of|for)\s*:?\s*([A-Za-z\u0600-\u06FF0-9\s+]{2,50}?)\s*$/i) ||
      message.match(/\b(?:clinet|client|customer)\s+(?:named|of|for)?\s*:?\s*([A-Za-z\u0600-\u06FF0-9\s+]{2,50}?)\s*$/i);
    const explicitClientTarget = wantsClientDetails
      ? (explicitClientDetailMatch ? cleanClientQuery(explicitClientDetailMatch[1]) : cleanClientQuery(message))
      : null;

    const explicitCarDetailMatch =
      message.match(/\b(?:details?|profile|page)\s+(?:of|for)\s*:?\s*([^\n,]{2,60}?)\s*$/i) ||
      message.match(/\b(?:car|vehicle|unit)\s+(?:named|of|for)?\s*:?\s*([^\n,]{2,60}?)\s*$/i);
    const explicitCarTarget = wantsVehicleDetails
      ? (explicitCarDetailMatch ? explicitCarDetailMatch[1].trim() : message.trim())
      : null;

    const clientRegex = /(?:\bfor client named\b|\bforclien named\b|\bfor client\b|\bclient named\b|\bcustomer named\b|\bfor customer\b|\bclient\b|\bcustomer\b|العميل|للعميل|لصالح)\s*:?\s*([A-Za-z\u0600-\u06FF\s]{2,45}?)(?=\s+(?:with|and\s+(?:sleect|select)|sleect|select|car|vehicle|بسيارة|سيارة|from|starting|for\s+\d|لمدة|من)|[,.\n]|$)/i;
    const forNameRegex = /\b(?:contract|booking|rent|rental)\s+for\s+([A-Za-z\u0600-\u06FF][A-Za-z\u0600-\u06FF\s]{1,35}?)(?=\s+(?:with|and\s+(?:sleect|select)|sleect|select|car|vehicle|from|starting|for\s+\d)|[,.\n]|$)/i;
    const clientMatch = !wantsClientDetails ? (message.match(clientRegex) || message.match(forNameRegex)) : null;
    const rawExtractedClient = clientMatch ? clientMatch[1].trim() : null;
    const reservedClientNoise = /^(new|new\s+client|new\s+clien|clien|client|customer|person|user|someone|any|a|an|the|car|vehicle|today|tomorrow|me|details|detail|profile|page|عميل|عميل\s+جديد|جديد|سيارة)$/i;
    const extractedClientName =
      rawExtractedClient && !reservedClientNoise.test(rawExtractedClient) ? rawExtractedClient : null;

    const isFleetQuestion =
      /\b(how many\s+(?:cars|vehicles|units)|list\s+.*(?:cars|vehicles)|available\s+cars|cars\s+(?:are\s+)?available|all\s+cars|fleet\s+status)\b|كم\s+سيارة|السيارات\s+المتاح/i.test(
        lower
      ) && !parseCarDetails(message).isKnownMake;
    const carRegex = /(?:\bsleect car\b|\bselect car\b|\bwith car\b|\bwith vehicle\b|\bchoose car\b|\bcar\b\s*:?|سيارة|بسيارة|مركبة)\s+([^\n,]+?)(?=\s+(?:from\s+today|from\s+\d|starting|to\s+\d|too\s+\d|until|for\s+\d+\s*(?:day|days|week|month)|من\s+اليوم|لمدة)|[,\n]|$)/i;
    const carMatch = !isFleetQuestion && !wantsVehicleDetails ? message.match(carRegex) : null;
    const rawExtractedCar = carMatch ? carMatch[1].replace(/^:\s*/, "").trim() : null;
    const reservedCarStartNoise = /^(are|is|was|were|available|free|rented|all|many|status|count|should|can|do|does|did|to|the|for|in|on|at|details|detail|page|profile)\b/i;
    const extractedCarName =
      rawExtractedCar && rawExtractedCar.length >= 2 && !reservedCarStartNoise.test(rawExtractedCar)
        ? rawExtractedCar
        : null;

    const parsedDates = parseRentalDates(message, todayDate);

    const isBareCarQuestionText =
      /\b(plate number you need|so i open or select the right one|by name alone in our fleet|open its page or create a contract)\b|رقم اللوحة هذا|لتحديد السيارة المطلوبة|بهذا الاسم فقط في الأسطول/i.test(
        lastAssistantText
      );
    const isContractCarQuestionText =
      /\b(which car|which vehicle|select one of these|select a car|which specific plate|select the exact car)\b|أي سيارة|اختر سيارة|تفضل اختيار واحدة|لاختيار السيارة الصحيحة/i.test(
        lastAssistantText
      );
    const lastWasContractTurn =
      lastWasContractAction || (lastAssistantMsgObj?.action !== "SEARCH_RESULT" && lastAssistantMsgObj?.action !== "NONE" && isContractCarQuestionText);

    const askedForClient = /who is the customer|who is the client|client name|من هو العميل|اسم العميل/.test(lastAssistantText);
    const askedForCar =
      isContractCarQuestionText ||
      (lastWasContractTurn && /plate number|model year|more details|رقم اللوحة|مزيد من التفاصيل/.test(lastAssistantText));
    const askedForDays = /how many days|duration|كم مدة|كم يوم/.test(lastAssistantText);
    const askedToFinalize = /shall i finalize|create the contract now|هل أعتمد|هل أنشئ العقد/.test(lastAssistantText);
    const askedForVehicleDetails =
      !lastWasContractTurn &&
      (isBareCarQuestionText ||
        (!/\bcontract\b|عقد/.test(lastAssistantText) &&
          /plate number|model year|more details|which one would you like|رقم اللوحة|مزيد من التفاصيل|تحديد رقم اللوحة/.test(
            lastAssistantText
          )));

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
    let intent = parsed?.intent || "GENERAL_CHAT";
    let attachedBackendData: AssistantResponse["data"] | undefined = undefined;
    let usedBackendQuery = false;

    // Pass 2: Execute targeted MongoDB query when the AI requests deep backend data
    if (intent === "QUERY_BACKEND" && parsed?.backendQuery?.queryType) {
      usedBackendQuery = true;
      try {
        const bqSpec = parsed.backendQuery as BackendQuerySpec;
        const queryResult = await executeBackendQuery(bqSpec);
        if (
          (queryResult as any)?.attachType &&
          Array.isArray((queryResult as any)?.attachItems) &&
          (queryResult as any).attachItems.length > 0
        ) {
          attachedBackendData = {
            type: (queryResult as any).attachType,
            items: (queryResult as any).attachItems.slice(0, 5),
          };
        }
        const synthesisSystem = `You are Leon Assistant for Leon Rent A Car (Dubai). The user is the authenticated company Admin/Owner. Summarize the verified MongoDB query result below accurately in ${lang === "ar" ? "Arabic" : "English"}. Always write monetary amounts in AED (never $ or USD). Return ONLY valid JSON: {"reply":"...","intent":"GENERAL_CHAT","targetUrl":null,"searchQuery":null}.`;
        const synthesisMessages = [
          { role: "system" as const, content: synthesisSystem },
          ...history.slice(-4).map((h) => ({
            role: (h.sender === "user" ? "user" : "assistant") as "user" | "assistant",
            content: h.text,
          })),
          {
            role: "user" as const,
            content: `Question: ${message}\n\nMONGODB RESULT (${bqSpec.queryType}):\n${JSON.stringify(queryResult).slice(0, 6000)}`,
          },
        ];
        const pass2Raw = await callSmartAIBrain(synthesisMessages, { jsonMode: true, maxTokens: 900 });
        if (pass2Raw) {
          try {
            const m2 = pass2Raw.match(/\{[\s\S]*\}/);
            const p2 = JSON.parse(m2 ? m2[0] : pass2Raw);
            aiReply = p2?.reply || aiReply;
            parsed = { ...p2, intent: p2?.intent || "GENERAL_CHAT" };
            intent = parsed.intent;
          } catch {
            aiReply = pass2Raw;
            intent = "GENERAL_CHAT";
          }
        } else {
          intent = "GENERAL_CHAT";
        }
      } catch (bqErr) {
        console.error("[AI Brain] Backend query failed:", bqErr);
        intent = "GENERAL_CHAT";
      }
    }

    if (wantsClientDetails && intent !== "OPEN_CLIENT_DETAILS" && intent !== "SEARCH_CLIENT") {
      intent = "OPEN_CLIENT_DETAILS";
    } else if (wantsVehicleDetails && intent !== "OPEN_VEHICLE_DETAILS" && intent !== "SEARCH_VEHICLE") {
      intent = "OPEN_VEHICLE_DETAILS";
    }
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
      const prevCarQuoteMatch = lastAssistantMsgObj?.text?.match(/matching vehicles for "([^"]+)"|سيارات مطابقة لـ "([^"]+)"/i);
      const prevCarQuote = prevCarQuoteMatch ? (prevCarQuoteMatch[1] || prevCarQuoteMatch[2] || "").trim() : "";
      const directReplyCheck = findUnitMatches(message.trim());
      const replyParsed = parseCarDetails(message.trim());
      if (prevCarQuote && !directReplyCheck.hasExplicitPlate && !replyParsed.isKnownMake) {
        cData.carName = `${prevCarQuote} ${message.trim()}`;
      } else {
        cData.carName = message.trim();
      }
    } else if (!cData.carName && askedForVehicleDetails && hasContractWords) {
      const discussedPlateMatch = lastAssistantMsgObj?.text?.match(/(?:Plate|لوحة)\s*:\s*\*?\*?([A-Za-z0-9-]+)\*?\*?/i);
      if (discussedPlateMatch) {
        cData.carName = discussedPlateMatch[1].trim();
      }
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

    const explicitNonContractIntent = new Set([
      "OPEN_CLIENT_DETAILS",
      "OPEN_VEHICLE_DETAILS",
      "OPEN_ADD_CLIENT_MODAL",
      "OPEN_ADD_UNIT_MODAL",
      "NAVIGATE",
      "SEARCH_CLIENT",
      "SEARCH_VEHICLE",
      "FLEET_OVERVIEW",
    ]);

    const looksLikeConfirmWord =
      /\b(yes|confirm|submit|create it|submit it|do it|finalize|now|go ahead)\b/i.test(lower) ||
      message.includes("نعم") ||
      message.includes("اعتمد") ||
      message.includes("انشئه") ||
      message.includes("سوه");

    const isContractRelated =
      !isGreetingOrSmallTalk &&
      !usedBackendQuery &&
      !wantsClientDetails &&
      !wantsVehicleDetails &&
      !isHowToQuestion &&
      (!askedForVehicleDetails || hasContractWords || intent === "CONTRACT_FLOW") &&
      !explicitNonContractIntent.has(intent) &&
      (intent === "CONTRACT_FLOW" ||
        hasContractWords ||
        askedForClient ||
        askedForCar ||
        askedForDays ||
        askedToFinalize ||
        (!isAnalyticalQuestion && Boolean(cData.clientName || cData.carName || cData.days)) ||
        (pathname.startsWith("/bookings/new") && looksLikeConfirmWord && !isAnalyticalQuestion));

    if (isContractRelated) {
      // 1. Resolve Client
      let resolvedClient: any = null;
      if (cData.clientName) {
        const clientMatches = await findClientMatches(cData.clientName);
        resolvedClient = clientMatches[0]?.client || null;
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
          invalidateBackendContextCache();
        }
      }

      if (!resolvedClient && existingParams.get("clientId")) {
        resolvedClient = (allClients as any[]).find((c) => String(c._id) === existingParams.get("clientId")) || {
          _id: existingParams.get("clientId"),
          name: existingParams.get("clientName") || existingClientName || "Customer",
        };
      }

      // Rescue validated DB client mentioned in prior contract assistant turn if URL search wasn't forwarded
      if (!resolvedClient && lastWasContractTurn && lastAssistantMsgObj?.text) {
        const prevClientMatch = lastAssistantMsgObj.text.match(
          /select the exact car for ([^?]+)\?|لاختيار السيارة الصحيحة للعميل ([^.]+)\.?/i
        );
        const prevClientCandidate = prevClientMatch ? (prevClientMatch[1] || prevClientMatch[2] || "").trim() : "";
        if (prevClientCandidate) {
          const rescuedMatches = await findClientMatches(prevClientCandidate);
          if (rescuedMatches.length > 0) {
            resolvedClient = rescuedMatches[0].client;
          }
        }
      }

      // 2. Resolve Vehicle
      let resolvedUnit: any = null;
      let requestedCarNotFound = false;
      let requestedCarAmbiguous = false;
      let ambiguousUnits: any[] = [];
      const requestedCarName = cData.carName ? cData.carName.trim() : "";

      if (requestedCarName) {
        const { matches: unitMatches, hasExplicitPlate, isBrandOnly } = findUnitMatches(requestedCarName);

        if (hasExplicitPlate && unitMatches.length > 0) {
          resolvedUnit = unitMatches.find((u) => u.status === "Available") || unitMatches[0];
        } else if (unitMatches.length > 1 || (unitMatches.length === 1 && isBrandOnly)) {
          // User gave only a brand or ambiguous car name without plate -> ask for plate/year/color!
          requestedCarAmbiguous = true;
          ambiguousUnits = unitMatches;
        } else if (unitMatches.length === 1) {
          resolvedUnit = unitMatches[0];
        } else {
          const parsedCar = parseCarDetails(requestedCarName);

          // Check by plate directly
          if (parsedCar.plate) {
            const cleanPlate = parsedCar.plate.replace(/\s+/g, "").toLowerCase();
            resolvedUnit = (allUnits as any[]).find(
              (u) => (u.plate || "").replace(/\s+/g, "").toLowerCase() === cleanPlate
            );
          }

          // Check by make + model (only if no explicit plate was specified)
          if (!resolvedUnit && !parsedCar.plate && parsedCar.make && parsedCar.model) {
            const mmMatches = (allUnits as any[]).filter(
              (u) =>
                u.make?.toLowerCase() === parsedCar.make.toLowerCase() &&
                u.model?.toLowerCase().includes(parsedCar.model.toLowerCase())
            );
            if (mmMatches.length > 1) {
              requestedCarAmbiguous = true;
              ambiguousUnits = mmMatches;
            } else if (mmMatches.length === 1) {
              resolvedUnit = mmMatches[0];
            }
          }
        }

        // If requested car does not exist in our fleet: DO NOT auto-create!
        if (!resolvedUnit && !requestedCarAmbiguous && requestedCarName.length >= 2) {
          requestedCarNotFound = true;
        }
      }

      if (!resolvedUnit && !requestedCarNotFound && !requestedCarAmbiguous && existingParams.get("unitId")) {
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
        requestedCarAmbiguous = false;
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

      // SCENARIO A0: Car name is ambiguous or only brand name given -> ask for plate/year/color
      if (requestedCarAmbiguous) {
        newParams.delete("unitId");
        newParams.delete("autoPilot");

        const matchListEn = ambiguousUnits
          .slice(0, 4)
          .map((u) => `${u.make} ${u.model} (${u.year || "N/A"}, ${u.color || "N/A"} • Plate: ${u.plate} • ${u.status})`)
          .join(" | ");
        const matchListAr = ambiguousUnits
          .slice(0, 4)
          .map((u) => `${u.make} ${u.model} (${u.year || ""}، ${u.color || ""} • لوحة ${u.plate})`)
          .join("، ");

        return NextResponse.json<AssistantResponse>({
          reply:
            lang === "ar"
              ? `وجدت سيارات مطابقة لـ "${requestedCarName}": ${matchListAr}. يرجى تحديد تفاصيل إضافية مثل **رقم اللوحة أو السنة أو اللون** لاختيار السيارة الصحيحة${clientLabel ? ` للعميل ${clientLabel}` : ""}.`
              : `I found matching vehicles for "${requestedCarName}": ${matchListEn}. Could you provide more details — such as the **plate number, model year, or color** — so I select the exact car${clientLabel ? ` for ${clientLabel}` : ""}?`,
          action: "CREATE_CONTRACT",
          navigateUrl: `/bookings/new?${newParams.toString()}`,
          data: {
            type: "vehicles",
            items: ambiguousUnits.slice(0, 4).map((u) => ({
              id: u._id,
              title: `${u.make} ${u.model}`,
              plate: u.plate,
              status: u.status,
            })),
          },
        });
      }

      // SCENARIO A: User requested a car that does NOT exist in fleet
      if (requestedCarNotFound) {
        newParams.delete("unitId");
        newParams.delete("autoPilot");

        const smartMissingReply =
          lang === "ar"
            ? `لم أجد سيارة "${requestedCarName}" بهذا الاسم في أسطولنا. هل يمكنك تزويدي بتفاصيل أكثر مثل **رقم اللوحة أو الموديل أو اللون**؟ السيارات المتوفرة حالياً: ${availableListAr || "لا توجد سيارات متاحة"}. هل نختار واحدة منها${clientLabel ? ` للعميل ${clientLabel}` : ""}، أم أفتح لك نافذة إضافة سيارة جديدة؟`
            : `I couldn't find "${requestedCarName}" in our fleet by name. Could you share more details like the **plate number, model year, or color**? Currently available: ${availableList || "None currently available"}. Would you like to pick one of these${clientLabel ? ` for ${clientLabel}` : ""}, or should I open the Add Car form?`;

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
      const lookupQuery =
        explicitClientTarget ||
        parsed?.searchQuery ||
        cData?.clientName ||
        cleanClientQuery(message);

      // Verify parsed?.clientId ONLY if its name matches at least one token of lookupQuery (never blindly trust an ID!)
      let targetClient: any = null;
      if (parsed?.clientId) {
        const byId = (allClients as any[]).find((c) => String(c._id) === String(parsed.clientId));
        if (byId) {
          const qt = tokensOf(lookupQuery);
          const cn = (byId.name || "").toLowerCase();
          if (qt.length === 0 || qt.some((t) => cn.includes(t))) {
            targetClient = byId;
          }
        }
      }

      let scoredMatches = targetClient ? [{ client: targetClient, score: 1000 }] : [];
      if (scoredMatches.length === 0 && lookupQuery) {
        scoredMatches = await findClientMatches(lookupQuery);
      }
      if (scoredMatches.length === 0 && parsed?.searchQuery && parsed.searchQuery !== lookupQuery) {
        scoredMatches = await findClientMatches(parsed.searchQuery);
      }

      if (scoredMatches.length > 1 && scoredMatches[0].score < 900 && scoredMatches[0].score - scoredMatches[1].score < 80) {
        const candidates = scoredMatches.slice(0, 5).map((m) => m.client);
        return NextResponse.json<AssistantResponse>({
          reply:
            lang === "ar"
              ? `وجدت أكثر من عميل مطابق لـ "${lookupQuery}". من فضلك اختر العميل المطلوب أو اكتب اسمه الكامل / رقم هاتفه:`
              : `I found multiple clients matching "${lookupQuery}". Which one would you like to open? (Click a card or share their full name / phone number.)`,
          action: "SEARCH_RESULT",
          data: {
            type: "clients",
            items: candidates.map((c: any) => ({
              id: c._id,
              name: c.name,
              phone: c.phone || "N/A",
            })),
          },
        });
      }

      targetClient = scoredMatches[0]?.client || null;

      if (targetClient) {
        // Always state the ACTUAL matched client's name & phone (never display a mismatched AI reply)
        return NextResponse.json<AssistantResponse>({
          reply:
            lang === "ar"
              ? `جاري فتح ملف العميل ${targetClient.name}${targetClient.phone ? ` (${targetClient.phone})` : ""}.`
              : `Opening client details for ${targetClient.name}${targetClient.phone ? ` (${targetClient.phone})` : ""}.`,
          action: "NAVIGATE",
          navigateUrl: `/clients/${targetClient._id}`,
          data: {
            type: "clients",
            items: [{ id: targetClient._id, name: targetClient.name, phone: targetClient.phone || "N/A" }],
          },
        });
      }

      return NextResponse.json<AssistantResponse>({
        reply:
          lang === "ar"
            ? `لم أجد أي عميل باسم "${lookupQuery || message}" في قاعدة البيانات. يرجى التأكد من الاسم أو كتابة رقم الهاتف / الهوية للبحث.`
            : `I couldn't find any client matching "${lookupQuery || message}" in your database. Please check the spelling or give me their phone number / ID.`,
        action: "NONE",
      });
    }

    // Handle follow-up plate/details OR pure bare car-name mentions ONLY when user isn't greeting, filtering, or asking an analytical question
    const parsedMsgCar = parseCarDetails(message);
    const matchedUnitsFromMessage =
      !isGreetingOrSmallTalk &&
      !isAnalyticalQuestion &&
      !isFleetFilterQuery &&
      !usedBackendQuery &&
      !hasContractWords &&
      !wantsClientDetails &&
      !isFleetQuestion
        ? findUnitMatches(message)
        : null;
    const hasBareVehicleCandidate =
      Boolean(parsedMsgCar.isKnownMake) ||
      Boolean(parsedMsgCar.plate) ||
      Boolean(matchedUnitsFromMessage && matchedUnitsFromMessage.matchedMakeOrModelOrPlate);
    const bareTokens = tokensOf(message);
    const hasConversationalQuestionOrVerb =
      /[?؟]/.test(message) ||
      /\b(who|what|when|where|why|how|which|can|could|would|should|do|does|did|is|are|was|were|have|has|had|tell|give|show|list|find|explain|compare|recommend|suggest|check|price|rate|cost|history|damage|damages|oil|vidange|insurance|expire|overdue|unpaid|revenue|profit|earned|earning|client|customer|contract)\b/i.test(
        lower
      );
    const isPureBareCarInput =
      hasBareVehicleCandidate &&
      !isFleetFilterQuery &&
      !isAnalyticalQuestion &&
      !hasAvailabilityOrFilterWords &&
      !hasConversationalQuestionOrVerb &&
      bareTokens.length >= 1 &&
      bareTokens.length <= 5;
    const isBareCarOrVehicleDetailsFlow =
      !isGreetingOrSmallTalk &&
      !usedBackendQuery &&
      !isFleetFilterQuery &&
      (intent === "OPEN_VEHICLE_DETAILS" ||
        (!isAnalyticalQuestion && askedForVehicleDetails) ||
        (!hasContractWords &&
          !wantsClientDetails &&
          !isFleetQuestion &&
          !isAnalyticalQuestion &&
          intent === "GENERAL_CHAT" &&
          (isPureBareCarInput || (!parsed && hasBareVehicleCandidate))));

    if (isBareCarOrVehicleDetailsFlow) {
      let carLookupQuery =
        explicitCarTarget ||
        parsed?.searchQuery ||
        cData?.carName ||
        message.trim();

      let confirmedFromPrompt = false;
      if (askedForVehicleDetails) {
        const isConfirmOpen =
          /^(yes|yep|yeah|open|open\s+it|open\s+page|it|this|confirm|details|ok|نعم|ايه|افتح|افتحها|التفاصيل)$/i.test(lower);
        const promptPlateMatch = lastAssistantMsgObj?.text?.match(/(?:Plate|لوحة)\s*:\s*\*?\*?([A-Za-z0-9-]+)\*?\*?/i);
        const prevUserCar = [...history]
          .reverse()
          .find((h) => h.sender === "user" && h.text.trim().toLowerCase() !== lower)?.text;

        if (isConfirmOpen && promptPlateMatch) {
          carLookupQuery = promptPlateMatch[1].trim();
          confirmedFromPrompt = true;
        } else if (isConfirmOpen && prevUserCar) {
          carLookupQuery = prevUserCar;
          confirmedFromPrompt = true;
        } else if (!parsedMsgCar.plate && !parsedMsgCar.isKnownMake && prevUserCar && !findUnitMatches(message.trim()).hasExplicitPlate) {
          carLookupQuery = `${prevUserCar} ${message.trim()}`;
        }
      }

      const { matches: unitMatches, hasExplicitPlate } = findUnitMatches(carLookupQuery);

      // Direct open if user explicitly provided plate number OR confirmed/narrowed down to 1 exact vehicle on Turn 2
      if ((hasExplicitPlate && unitMatches.length === 1) || ((confirmedFromPrompt || askedForVehicleDetails) && unitMatches.length === 1)) {
        const targetUnit = unitMatches[0];
        return NextResponse.json<AssistantResponse>({
          reply:
            lang === "ar"
              ? `جاري فتح تفاصيل سيارة ${targetUnit.make} ${targetUnit.model} (لوحة: ${targetUnit.plate}).`
              : `Opening details for ${targetUnit.make} ${targetUnit.model} (Plate: ${targetUnit.plate}).`,
          action: "NAVIGATE",
          navigateUrl: `/units/${targetUnit._id}`,
          data: {
            type: "vehicles",
            items: [{ id: targetUnit._id, title: `${targetUnit.make} ${targetUnit.model}`, plate: targetUnit.plate, status: targetUnit.status }],
          },
        });
      }

      // If 0 vehicles matched -> NEVER grab [0]! Ask for plate, year, or color + list available options
      if (unitMatches.length === 0) {
        const availableCarsText = (allUnits as any[])
          .filter((u) => u.status === "Available")
          .slice(0, 3)
          .map((u) => `${u.make} ${u.model} (Plate: ${u.plate})`)
          .join(" | ");
        return NextResponse.json<AssistantResponse>({
          reply:
            lang === "ar"
              ? `لم أجد "${carLookupQuery}" بهذا الاسم فقط في الأسطول. يرجى إعطائي تفاصيل أكثر مثل **رقم اللوحة أو سنة الصنع أو اللون** لأتحقق منها${availableCarsText ? ` — أو اختر من المتاح: ${availableCarsText}` : ""}.`
              : `I couldn't find "${carLookupQuery}" by name alone in our fleet. Could you share more details such as the **plate number, model year, or color**?${availableCarsText ? ` Currently available: ${availableCarsText}.` : ""}`,
          action: "NONE",
        });
      }

      // Multiple matches OR user gave only car name without plate -> ask for plate/year/color details while showing cards
      if (unitMatches.length > 1) {
        return NextResponse.json<AssistantResponse>({
          reply:
            lang === "ar"
              ? `وجدت ${unitMatches.length} سيارات مطابقة لـ "${carLookupQuery}". من فضلك اكتب تفاصيل أكثر مثل **رقم اللوحة أو سنة الصنع أو اللون** لتحديد السيارة المطلوبة:`
              : `I found ${unitMatches.length} vehicles matching "${carLookupQuery}". Could you share more details like the **plate number, model year, or color** so I open or select the right one?`,
          action: "SEARCH_RESULT",
          data: {
            type: "vehicles",
            items: unitMatches.slice(0, 5).map((u: any) => ({
              id: u._id,
              title: `${u.make} ${u.model} (${u.year || "N/A"} • ${u.color || "N/A"})`,
              plate: u.plate,
              status: u.status,
            })),
          },
        });
      }

      // Single match found when user gave car name without plate -> show details + ask to confirm plate / extra details
      const u = unitMatches[0];
      return NextResponse.json<AssistantResponse>({
        reply:
          lang === "ar"
            ? `وجدت سيارة **${u.make} ${u.model}** (${u.year || "—"}، ${u.color || "—"} • لوحة: **${u.plate}** • الحالة: ${u.status}). هل تؤكد **رقم اللوحة** هذا أم لديك تفاصيل أخرى (اللوحة/اللون/الموديل)، وهل تريد فتح صفحتها أو إنشاء عقد؟`
            : `I found **${u.make} ${u.model}** (${u.year || "N/A"}, ${u.color || "N/A"} • Plate: **${u.plate}** • ${u.status} • AED ${u.dailyRate || 85}/day). Can you confirm if **${u.plate}** is the plate number you need (or share more details like plate/color/year), and tell me if you want to open its page or create a contract?`,
        action: "SEARCH_RESULT",
        data: {
          type: "vehicles",
          items: [
            {
              id: u._id,
              title: `${u.make} ${u.model}`,
              plate: u.plate,
              status: u.status,
            },
          ],
        },
      });
    }

    if (intent === "NAVIGATE" && parsed?.targetUrl) {
      return NextResponse.json<AssistantResponse>({
        reply: aiReply || (lang === "ar" ? "جاري الانتقال الآن..." : "Navigating now..."),
        action: "NAVIGATE",
        navigateUrl: parsed.targetUrl,
      });
    }

    if (
      intent === "FLEET_OVERVIEW" ||
      (!parsed && isFleetQuestion)
    ) {
      return NextResponse.json<AssistantResponse>({
        reply:
          aiReply ||
          (lang === "ar"
            ? `لديك حالياً ${availableUnits} سيارة متاحة من أصل ${totalUnits}، و${rentedUnits} مؤجرة، و${maintenanceUnits} في الصيانة مع ${activeContractsCount} عقد نشط.`
            : `We currently have ${availableUnits} available cars out of ${totalUnits} total, with ${rentedUnits} rented, ${maintenanceUnits} in maintenance, and ${activeContractsCount} active contracts.`),
        action: "OVERVIEW",
        data: {
          type: "overview",
          stats: {
            totalUnits,
            availableUnits,
            rentedUnits,
            maintenanceUnits,
            activeContracts: activeContractsCount,
          },
        },
      });
    }

    if (intent === "SEARCH_CLIENT") {
      const lookupQuery = parsed?.searchQuery || cleanClientQuery(message);
      const scored = lookupQuery
        ? await findClientMatches(lookupQuery)
        : (allClients as any[]).slice(0, 4).map((client) => ({ client, score: 100 }));
      const matched = scored.slice(0, 4).map((m) => m.client);

      if (matched.length === 0) {
        return NextResponse.json<AssistantResponse>({
          reply:
            lang === "ar"
              ? `لم أجد أي عميل مطابق لـ "${lookupQuery || message}" في قاعدة البيانات. يرجى التأكد من الاسم أو كتابة رقم الهاتف.`
              : `I couldn't find any client matching "${lookupQuery || message}". Please check the spelling or try their phone number.`,
          action: "NONE",
        });
      }

      return NextResponse.json<AssistantResponse>({
        reply:
          lang === "ar"
            ? `نتائج البحث عن "${lookupQuery || "العملاء"}": ${matched.map((c: any) => c.name).join("، ")}`
            : `Matching clients${lookupQuery ? ` for "${lookupQuery}"` : ""}: ${matched.map((c: any) => c.name).join(", ")}.`,
        action: "SEARCH_RESULT",
        data: {
          type: "clients",
          items: matched.map((c: any) => ({
            id: c._id,
            name: c.name,
            phone: c.phone || "N/A",
          })),
        },
      });
    }

    if (intent === "SEARCH_VEHICLE") {
      const searchQ = parsed?.searchQuery || message;
      const explicitFilterStatus = parsed?.filterStatus as string | undefined;
      const fm = findUnitMatches(searchQ);
      const effectiveStatus = explicitFilterStatus || fm.requestedStatus || detectedQueryStatus;
      let matched = fm.matches;
      if (effectiveStatus && !fm.requestedStatus) {
        matched = matched.filter(
          (u: any) => String(u.status || "").toLowerCase() === effectiveStatus.toLowerCase()
        );
      }

      if (matched.length === 0) {
        if (fm.brandMatchesCount > 0 && effectiveStatus) {
          const statusDetails = fm.baseMatches
            .slice(0, 4)
            .map((u: any) => `${u.make} ${u.model} (Plate: ${u.plate} — ${u.status})`)
            .join(" | ");
          return NextResponse.json<AssistantResponse>({
            reply:
              aiReply ||
              (lang === "ar"
                ? `يوجد ${fm.brandMatchesCount} سيارة مطابقة لـ "${searchQ}" في الأسطول، لكن لا توجد أي واحدة بحالة "${effectiveStatus}" حالياً${statusDetails ? ` (${statusDetails})` : ""}.`
                : `We have ${fm.brandMatchesCount} vehicle(s) matching "${searchQ}" in our fleet, but none are currently ${effectiveStatus}${statusDetails ? ` (${statusDetails})` : ""}.`),
            action: "NONE",
          });
        }
        return NextResponse.json<AssistantResponse>({
          reply:
            aiReply ||
            (lang === "ar"
              ? `لم أجد سيارات مطابقة لـ "${searchQ}" في الأسطول حالياً.`
              : `No vehicles matching "${searchQ}" were found in our fleet right now.`),
          action: "NONE",
        });
      }

      return NextResponse.json<AssistantResponse>({
        reply: aiReply || (lang === "ar" ? "نتائج البحث في الأسطول:" : "Here are the matching fleet vehicles:"),
        action: "SEARCH_RESULT",
        data: {
          type: "vehicles",
          items: matched.slice(0, 6).map((u: any) => ({
            id: u._id,
            title: `${u.make} ${u.model} (${u.year || "N/A"} • ${u.color || "N/A"})`,
            plate: u.plate,
            status: u.status,
          })),
        },
      });
    }

    // Attach clickable vehicle cards when AI answered a fleet filter, availability, or brand query in GENERAL_CHAT
    if (
      aiReply &&
      !attachedBackendData &&
      !isGreetingOrSmallTalk &&
      !hasContractWords &&
      (isFleetFilterQuery ||
        (parsed?.searchQuery &&
          (parsed?.filterStatus || parseCarDetails(String(parsed.searchQuery)).isKnownMake)))
    ) {
      const explicitFilterStatus = (parsed?.filterStatus as string | undefined) || detectedQueryStatus;
      const cardQuery = parsed?.searchQuery
        ? `${parsed.searchQuery}${explicitFilterStatus ? ` ${explicitFilterStatus}` : ""}`
        : message;
      const fm = findUnitMatches(cardQuery);
      let matched = fm.matches;
      if (explicitFilterStatus && !fm.requestedStatus) {
        matched = matched.filter(
          (u: any) => String(u.status || "").toLowerCase() === explicitFilterStatus.toLowerCase()
        );
      }
      if (matched.length > 0 && (fm.matchedMakeOrModelOrPlate || isFleetFilterQuery)) {
        attachedBackendData = {
          type: "vehicles",
          items: matched.slice(0, 6).map((u: any) => ({
            id: u._id,
            title: `${u.make} ${u.model} (${u.year || "N/A"} • ${u.color || "N/A"})`,
            plate: u.plate,
            status: u.status,
          })),
        };
      }
    }

    // Smart Backend Q&A Fallback when AI provider is offline or returned empty
    if (!aiReply) {
      if (isGreetingOrSmallTalk) {
        aiReply =
          lang === "ar"
            ? `أهلاً بك! لدينا حالياً ${availableUnits}/${totalUnits} سيارة متاحة و${activeContractsCount} عقد نشط. كيف أساعدك اليوم؟`
            : `Hi! We currently have ${availableUnits}/${totalUnits} vehicles available and ${activeContractsCount} active contracts. How can I help you today?`;
      } else if (isFleetFilterQuery) {
        const fm = findUnitMatches(message);
        const effStatus = fm.requestedStatus || detectedQueryStatus;
        if (fm.matches.length > 0) {
          const previewList = fm.matches
            .slice(0, 6)
            .map(
              (u: any) =>
                `- **${u.make} ${u.model}** (${u.year || "N/A"}, ${u.color || "N/A"}) — Plate: **${u.plate}** | ${u.status} | AED ${u.dailyRate || 85}/day`
            )
            .join("\n");
          aiReply =
            lang === "ar"
              ? `وجدت ${fm.matches.length} سيارة${effStatus ? ` (${effStatus === "Available" ? "متاحة" : effStatus === "Rented" ? "مؤجرة" : "في الصيانة"})` : ""}:\n${previewList}`
              : `Found ${fm.matches.length} matching vehicle(s)${effStatus ? ` (${effStatus})` : ""}:\n${previewList}`;
          attachedBackendData = {
            type: "vehicles",
            items: fm.matches.slice(0, 6).map((u: any) => ({
              id: u._id,
              title: `${u.make} ${u.model} (${u.year || "N/A"} • ${u.color || "N/A"})`,
              plate: u.plate,
              status: u.status,
            })),
          };
        } else if (fm.brandMatchesCount > 0 && effStatus) {
          const statusDetails = fm.baseMatches
            .slice(0, 4)
            .map((u: any) => `${u.make} ${u.model} (Plate: ${u.plate} — ${u.status})`)
            .join(" | ");
          aiReply =
            lang === "ar"
              ? `يوجد ${fm.brandMatchesCount} سيارة مطابقة في الأسطول، لكن لا توجد أي واحدة بحالة ${effStatus} حالياً${statusDetails ? ` (${statusDetails})` : ""}.`
              : `We have ${fm.brandMatchesCount} matching vehicle(s) in our fleet, but none are currently ${effStatus}${statusDetails ? ` (${statusDetails})` : ""}.`;
        } else {
          const fallbackPool = (allUnits as any[]).filter((u) =>
            effStatus ? u.status === effStatus : u.status === "Available"
          );
          const availPreview = fallbackPool
            .slice(0, 5)
            .map((u: any) => `${u.make} ${u.model} (Plate: ${u.plate} • AED ${u.dailyRate || 85}/day)`)
            .join(" | ");
          aiReply =
            lang === "ar"
              ? `لم أجد سيارات مطابقة تماماً لطلبك. ${effStatus || "المتاح"} حالياً (${fallbackPool.length}): ${availPreview || "لا يوجد"}`
              : `I couldn't find a matching vehicle for that filter in our fleet. Currently ${effStatus || "Available"} (${fallbackPool.length}): ${availPreview || "None"}.`;
        }
      } else if (/\b(revenue|income|profit|earning|money)\b|ارباح|أرباح|دخل|ايرادات|إيرادات/i.test(lower)) {
        aiReply =
          lang === "ar"
            ? `إيرادات العقود هذا الشهر: AED ${kpis.revenueThisMonth.toLocaleString("en-US")} (الشهر الماضي: AED ${kpis.revenueLastMonth.toLocaleString("en-US")})، والإجمالي التراكمي: AED ${kpis.revenueAllTime.toLocaleString("en-US")}. المبالغ المعلّقة: AED ${kpis.pendingBalanceTotal.toLocaleString("en-US")}.`
            : `Contract revenue this month: AED ${kpis.revenueThisMonth.toLocaleString("en-US")} (last month: AED ${kpis.revenueLastMonth.toLocaleString("en-US")}), all-time net: AED ${kpis.revenueAllTime.toLocaleString("en-US")}. Unpaid balances: AED ${kpis.pendingBalanceTotal.toLocaleString("en-US")}.`;
      } else if (/\b(damage|damages)\b|أضرار|اضرار/i.test(lower)) {
        aiReply =
          lang === "ar"
            ? `يوجد حالياً ${kpis.pendingDamagesCount} تقارير أضرار معلقة بتكلفة تقديرية AED ${kpis.pendingDamagesCost.toLocaleString("en-US")}.`
            : `There are currently ${kpis.pendingDamagesCount} pending damage report(s) with an estimated cost of AED ${kpis.pendingDamagesCost.toLocaleString("en-US")}.`;
      } else if (/\b(overdue|unpaid|balance)\b|\bpending\s+(balance|payment|payments|contract|contracts)\b|متأخر|غير مدفوع|معلق/i.test(lower)) {
        aiReply =
          lang === "ar"
            ? `يوجد حالياً ${kpis.overdueContracts} عقد متأخر عن التسليم، و${kpis.unpaidContracts} عقد غير مدفوع بالكامل (إجمالي المتبقي AED ${kpis.pendingBalanceTotal.toLocaleString("en-US")}).`
            : `There are currently ${kpis.overdueContracts} overdue contract(s) and ${kpis.unpaidContracts} unpaid/partial contract(s) with AED ${kpis.pendingBalanceTotal.toLocaleString("en-US")} pending.`;
      } else if (/\bhow\s+(?:do\s+i|can\s+i|to)\b|كيف\s+(?:أنشئ|انشئ|أسوي|اسوي|أعمل|اعمل)/i.test(lower) && /\b(contract|booking)\b|عقد/i.test(lower)) {
        aiReply =
          lang === "ar"
            ? "لإنشاء عقد جديد: افتح صفحة `/bookings/new`، اختر النوع (Shop أو Delivery أو Personalized)، ثم حدد العميل والسيارة والتواريخ والأسعار والدفعة المقدمة، أو اكتب لي: «أنشئ عقد لاسم العميل بسيارة ... لمدة X أيام»."
            : "To create a contract: go to `/bookings/new`, choose the contract type (Shop, Delivery, or Personalized), select the client and vehicle, set dates, daily rate, deposit/advance payment, and submit — or tell me the client, car, and days and I'll prepare it for you.";
      } else if (/\b(contract|contracts)\b|عقود|عقد/i.test(lower)) {
        aiReply =
          lang === "ar"
            ? `ملخص العقود: ${kpis.totalContracts} إجمالي | ${activeContractsCount} نشط | ${kpis.draftContracts} مسودة | ${kpis.completedContracts} مكتمل | ${kpis.overdueContracts} متأخر.`
            : `Contracts summary: ${kpis.totalContracts} total | ${activeContractsCount} Active | ${kpis.draftContracts} Draft | ${kpis.completedContracts} Completed | ${kpis.overdueContracts} Overdue.`;
      } else {
        const navMap: { pattern: RegExp; url: string; labelEn: string; labelAr: string }[] = [
          { pattern: /\b(dashboard|home)\b|الرئيسية|الداشبورد/i, url: "/", labelEn: "Opening Dashboard.", labelAr: "فتحت لك لوحة التحكم." },
          { pattern: /\b(bookings|contracts)\b|العقود|الحجوزات/i, url: "/bookings", labelEn: "Opening Contracts.", labelAr: "فتحت لك صفحة العقود." },
          { pattern: /\b(clients|customers)\b|العملاء/i, url: "/clients", labelEn: "Opening Clients.", labelAr: "فتحت لك صفحة العملاء." },
          { pattern: /\b(units|vehicles)\b|المركبات|الوحدات/i, url: "/units", labelEn: "Opening Vehicles.", labelAr: "فتحت لك صفحة السيارات." },
          { pattern: /\b(calendar)\b|التقويم/i, url: "/calendar", labelEn: "Opening Calendar.", labelAr: "فتحت لك التقويم." },
          { pattern: /\b(reports|analytics)\b|التقارير/i, url: "/reports", labelEn: "Opening Reports.", labelAr: "فتحت لك التقارير." },
          { pattern: /\b(damages)\b|الأضرار/i, url: "/damages", labelEn: "Opening Damages.", labelAr: "فتحت لك صفحة الأضرار." },
          { pattern: /\b(drivers)\b|السائقين/i, url: "/drivers", labelEn: "Opening Drivers.", labelAr: "فتحت لك صفحة السائقين." },
          { pattern: /\b(inspections)\b|الفحوصات/i, url: "/inspections", labelEn: "Opening Inspections.", labelAr: "فتحت لك صفحة الفحوصات." },
          { pattern: /\b(logs)\b|السجلات/i, url: "/logs", labelEn: "Opening Activity Logs.", labelAr: "فتحت لك سجل النشاط." },
          { pattern: /\b(notifications)\b|الإشعارات/i, url: "/notifications", labelEn: "Opening Notifications.", labelAr: "فتحت لك الإشعارات." },
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
    }

    return NextResponse.json<AssistantResponse>({
      reply:
        aiReply ||
        (lang === "ar"
          ? `أهلاً بك! لدينا ${availableUnits} سيارة متاحة من أصل ${totalUnits} و${activeContractsCount} عقد نشط. اسألني عن أي عميل، سيارة، إيرادات، عقود متأخرة، أضرار، أو اطلب إنشاء عقد.`
          : `How can I help? We currently have ${availableUnits}/${totalUnits} available cars and ${activeContractsCount} active contracts. Ask me anything about revenue, clients, cars, overdue contracts, damages, or creating a contract.`),
      action: attachedBackendData ? "SEARCH_RESULT" : "NONE",
      ...(attachedBackendData ? { data: attachedBackendData } : {}),
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
