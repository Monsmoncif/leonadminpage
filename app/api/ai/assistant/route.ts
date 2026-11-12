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

// Call Groq LLM (supports conversation history + JSON output)
async function callGroqBrain(
  messagesPayload: { role: "system" | "user" | "assistant"; content: string }[]
): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const models = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];
  for (const model of models) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: messagesPayload,
          temperature: 0.3,
          max_tokens: 1000,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const text = json.choices?.[0]?.message?.content?.trim();
        if (text) return text;
      }
    } catch {
      // Try next model if any network or rate-limit issue
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
    if (
      lower.includes("click ") ||
      lower.includes("press ") ||
      lower === "next" ||
      lower === "next step" ||
      lower === "previous step" ||
      lower === "go back" ||
      lower === "submit" ||
      lower === "confirm" ||
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

    await connectDB();

    // Load live context from MongoDB so the AI knows every client, car, and contract
    const [allClients, allUnits, recentContracts, totalUnits, availableUnits, rentedUnits, activeContractsCount] =
      await Promise.all([
        Client.find().sort({ updatedAt: -1 }).limit(100).lean(),
        Unit.find().sort({ updatedAt: -1 }).limit(100).lean(),
        Contract.find()
          .sort({ createdAt: -1 })
          .populate("clientId", "name phone")
          .populate("unitId", "make model plate")
          .limit(15)
          .lean(),
        Unit.countDocuments(),
        Unit.countDocuments({ status: "Available" }),
        Unit.countDocuments({ status: "Rented" }),
        Contract.countDocuments({ status: "Active" }),
      ]);

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
      const qt = tokensOf(q);
      const hay = (u: any) => `${u.make || ""} ${u.model || ""} ${u.plate || ""}`.toLowerCase();
      const matches = (allUnits as any[]).filter((u) => qt.length > 0 && qt.every((t) => hay(u).includes(t)));
      return (
        matches.find((u) => u.status === "Available") ||
        matches[0] ||
        (allUnits as any[]).find((u) => (u.plate || "").toLowerCase().replace(/\s/g, "") === q.toLowerCase().replace(/\s/g, "")) ||
        null
      );
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
      .slice(0, 20)
      .map((c: any) => `- Name: "${c.name}" | Phone: ${c.phone || "N/A"}`)
      .join("\n");

    const availableUnitsList = (allUnits as any[]).filter((u) => u.status === "Available");
    const unitsSummary = (availableUnitsList.length > 0 ? availableUnitsList : allUnits)
      .slice(0, 20)
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

    const rawBrainOutput = await callGroqBrain(chatMessages);

    if (rawBrainOutput) {
      try {
        const jsonMatch = rawBrainOutput.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawBrainOutput);
        const aiReply = parsed.reply || (lang === "ar" ? "حاضر!" : "On it!");
        const intent = parsed.intent || "GENERAL_CHAT";
        const cData = parsed.contractData || {};

        // =====================================================================
        // 1. CONTRACT FLOW: SMART MULTI-TURN CONVERSATION & PREFILL
        // =====================================================================
        const isContractRelated =
          intent === "CONTRACT_FLOW" ||
          lower.includes("contract") ||
          lower.includes("contrac") ||
          lower.includes("booking") ||
          message.includes("عقد") ||
          message.includes("حجز") ||
          pathname.startsWith("/bookings/new") ||
          Boolean(cData.clientName || cData.carName || cData.contractType || cData.days);

        if (isContractRelated) {
          // Resolve client: priority to newly extracted name, fallback to existing in URL
          let resolvedClient: any = null;
          if (cData.clientName) {
            resolvedClient = findClient(cData.clientName);
            // If the user specified a real person's name (e.g. "Khalil") that isn't in DB yet, auto-create it!
            if (!resolvedClient && cData.clientName.trim().length >= 2 && !/new\s+client|عميل\s+جديد/i.test(cData.clientName)) {
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
            }
          }

          if (!resolvedClient && existingParams.get("clientId")) {
            resolvedClient = (allClients as any[]).find((c) => String(c._id) === existingParams.get("clientId")) || {
              _id: existingParams.get("clientId"),
              name: existingParams.get("clientName") || existingClientName || "Customer",
            };
          }

          // Resolve vehicle: priority to newly extracted car, fallback to existing in URL
          let resolvedUnit: any = null;
          if (cData.carName) {
            resolvedUnit = findUnit(cData.carName);
          }
          if (!resolvedUnit && existingParams.get("unitId")) {
            resolvedUnit = (allUnits as any[]).find((u) => String(u._id) === existingParams.get("unitId")) || null;
          }

          // If user specifically asked for "any car" / "available car" / "auto"
          if (
            !resolvedUnit &&
            (/\b(any\s+car|first\s+car|available\s+car|auto)\b/i.test(lower) ||
              message.includes("اي سيارة") ||
              message.includes("أي سيارة") ||
              message.includes("اول سيارة"))
          ) {
            resolvedUnit = (allUnits as any[]).find((u) => u.status === "Available") || (allUnits as any[])[0] || null;
          }

          // Contract Type
          const resolvedType =
            cData.contractType ||
            (existingParams.get("contractType") as "Shop" | "Delivery" | "Personalized") ||
            "Shop";

          // Accumulate parameters in URL
          const newParams = new URLSearchParams(existingParams.toString());
          newParams.set("contractType", resolvedType);
          newParams.delete("openAddClient");
          newParams.delete("autoPilot");
          newParams.delete("autoSubmit");

          if (resolvedClient) {
            newParams.set("clientId", String(resolvedClient._id));
            if (resolvedClient.name) newParams.set("clientName", String(resolvedClient.name));
          }
          if (resolvedUnit) newParams.set("unitId", String(resolvedUnit._id));
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

          // If user explicitly asks for "new client" without a name, trigger Add Client modal on contract page
          if (/new\s+client|عميل\s+جديد/i.test(message) && !cData.clientName) {
            newParams.set("openAddClient", "true");
          }

          // Auto-submit condition: client + car known AND user said yes / confirm / auto / create it
          const isConfirmed =
            Boolean(cData.readyToSubmit) ||
            /\b(yes|confirm|create it|submit it|do it|finalize|now|go ahead)\b/i.test(lower) ||
            message.includes("نعم") ||
            message.includes("اعتمد") ||
            message.includes("انشئه") ||
            message.includes("سوه");

          if (isConfirmed && resolvedClient && resolvedUnit && resolvedType !== "Delivery") {
            newParams.set("autoPilot", "true");
            newParams.set("autoSubmit", "true");
          }

          return NextResponse.json<AssistantResponse>({
            reply: aiReply,
            action: "CREATE_CONTRACT",
            navigateUrl: `/bookings/new?${newParams.toString()}`,
          });
        }

        // =====================================================================
        // 2. OTHER INTELLIGENT INTENTS
        // =====================================================================
        if (intent === "OPEN_ADD_CLIENT_MODAL") {
          return NextResponse.json<AssistantResponse>({
            reply: aiReply,
            action: "OPEN_ADD_CLIENT_MODAL",
            uiAction: "OPEN_ADD_CLIENT_MODAL",
          });
        }

        if (intent === "OPEN_ADD_UNIT_MODAL") {
          return NextResponse.json<AssistantResponse>({
            reply: aiReply,
            action: "OPEN_ADD_UNIT_MODAL",
            uiAction: "OPEN_ADD_UNIT_MODAL",
          });
        }

        if (intent === "OPEN_CLIENT_DETAILS") {
          const targetClient: any =
            (parsed.clientId && (allClients as any[]).find((c) => String(c._id) === String(parsed.clientId))) ||
            findClient(parsed.searchQuery) ||
            (allClients as any[])[0];

          if (targetClient) {
            return NextResponse.json<AssistantResponse>({
              reply: aiReply,
              action: "NAVIGATE",
              navigateUrl: `/clients/${targetClient._id}`,
              data: { type: "clients", items: [targetClient] },
            });
          }
        }

        if (intent === "OPEN_VEHICLE_DETAILS") {
          const targetUnit: any =
            (parsed.unitId && (allUnits as any[]).find((u) => String(u._id) === String(parsed.unitId))) ||
            findUnit(parsed.searchQuery) ||
            (allUnits as any[])[0];

          if (targetUnit) {
            return NextResponse.json<AssistantResponse>({
              reply: aiReply,
              action: "NAVIGATE",
              navigateUrl: `/units/${targetUnit._id}`,
              data: { type: "vehicles", items: [targetUnit] },
            });
          }
        }

        if (intent === "NAVIGATE" && parsed.targetUrl) {
          return NextResponse.json<AssistantResponse>({
            reply: aiReply,
            action: "NAVIGATE",
            navigateUrl: parsed.targetUrl,
          });
        }

        if (intent === "FLEET_OVERVIEW") {
          return NextResponse.json<AssistantResponse>({
            reply: aiReply,
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
          const q = (parsed.searchQuery || "").toLowerCase();
          const matched = (allClients as any[])
            .filter((c) => !q || c.name?.toLowerCase().includes(q) || c.phone?.includes(q))
            .slice(0, 4);

          return NextResponse.json<AssistantResponse>({
            reply: aiReply,
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
          const q = (parsed.searchQuery || "").toLowerCase();
          const matched = (allUnits as any[])
            .filter((u) => !q || u.make?.toLowerCase().includes(q) || u.model?.toLowerCase().includes(q) || u.plate?.toLowerCase().includes(q))
            .slice(0, 4);

          return NextResponse.json<AssistantResponse>({
            reply: aiReply,
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

        return NextResponse.json<AssistantResponse>({
          reply: aiReply,
          action: "NONE",
        });
      } catch {
        // Fallback if JSON parsing fails: return LLM's raw text
        return NextResponse.json<AssistantResponse>({
          reply: rawBrainOutput,
          action: "NONE",
        });
      }
    }

    // Default polite response if offline
    return NextResponse.json<AssistantResponse>({
      reply:
        lang === "ar"
          ? "أنا معك! أخبرني باسم العميل أو السيارة، وسأقوم بتجهيز العقد وتعبئة بياناته فوراً."
          : "I'm with you! Tell me the client or car name, and I'll prepare and fill the contract immediately.",
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
