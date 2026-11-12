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
          temperature: 0.2,
          max_tokens: 500,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const text = json.choices?.[0]?.message?.content?.trim();
        if (text) return text;
      }
    } catch {
      // Try fallback model
    }
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = (body.message || "").trim();
    const history: { sender: string; text: string }[] = Array.isArray(body.history) ? body.history : [];
    const isArabic = /[\u0600-\u06FF]/.test(message);
    const lang = isArabic ? "ar" : body.lang || "en";

    if (!message) {
      return NextResponse.json<AssistantResponse>({
        reply: lang === "ar" ? "أهلاً بك! كيف أساعدك؟" : "Hey! How can I help you?",
        action: "NONE",
      });
    }

    await connectDB();

    // Load live context from MongoDB so both fast-rules and the AI Brain know every client, car, and contract
    const [allClients, allUnits, recentContracts, totalUnits, availableUnits, rentedUnits, activeContractsCount] =
      await Promise.all([
        Client.find().sort({ updatedAt: -1 }).limit(50).lean(),
        Unit.find().sort({ updatedAt: -1 }).limit(50).lean(),
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

    const lower = message.toLowerCase();

    // =========================================================================
    // 1. FAST MATCH: ADD / CREATE NEW CLIENT OR COMPANY
    // =========================================================================
    const isAddCompanyIntent =
      lower.includes("add company") ||
      lower.includes("new company") ||
      lower.includes("create company") ||
      lower.includes("add b2b") ||
      message.includes("اضف شركة") ||
      message.includes("إضافة شركة") ||
      message.includes("اضافة شركة") ||
      message.includes("شركة جديدة");

    if (isAddCompanyIntent) {
      return NextResponse.json<AssistantResponse>({
        reply:
          lang === "ar"
            ? "حاضر! فتحت لك نافذة إضافة شركة جديدة."
            : "Sure! Opening the Add Company form now.",
        action: "OPEN_ADD_COMPANY_MODAL",
        uiAction: "OPEN_ADD_COMPANY_MODAL",
      });
    }

    const isAddClientIntent =
      /(?:add|create|creat|new|register|make)\s+(?:a\s+)?(?:new\s+)?(?:client|clint|customer|custmer)/i.test(lower) ||
      lower.includes("add client") ||
      lower.includes("add new client") ||
      lower.includes("add clint") ||
      lower.includes("add new clint") ||
      lower.includes("create client") ||
      lower.includes("new client") ||
      lower.includes("add customer") ||
      lower.includes("add new customer") ||
      lower.includes("new customer") ||
      message.includes("اضف عميل") ||
      message.includes("إضافة عميل") ||
      message.includes("اضافة عميل") ||
      message.includes("عميل جديد") ||
      message.includes("انشاء عميل") ||
      message.includes("انشئ عميل") ||
      message.includes("سجل عميل") ||
      message.includes("اضف زبون") ||
      message.includes("زبون جديد");

    if (isAddClientIntent) {
      const phoneMatch = message.match(/(?:\+?\d[\d\s-]{6,14}\d)/);
      const extractedPhone = phoneMatch ? phoneMatch[0].replace(/\s+/g, "").trim() : "";

      const emailMatch = message.match(/\S+@\S+\.\S+/);
      const extractedEmail = emailMatch ? emailMatch[0].trim() : "";

      const nameCandidate = message
        .replace(/(?:\+?\d[\d\s-]{6,14}\d)/g, "")
        .replace(/\S+@\S+\.\S+/g, "")
        .replace(
          /\b(can you|please|i want to|go and|add|create|creat|make|register|a|an|new|client|clint|customer|custmer|named|called|name|phone|number|mobile|tel|email|with|for me|now|immediately)\b/gi,
          ""
        )
        .replace(
          /(ممكن|لو سمحت|اضف|إضافة|اضافة|انشئ|إنشاء|انشاء|سجل|عميل|زبون|جديد|باسم|اسمه|اسم|رقم|هاتف|جوال|تلفون|ايميل|الآن|فورا)/g,
          ""
        )
        .replace(/[,:;-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (nameCandidate.length >= 2) {
        const newClient = await Client.create({
          name: nameCandidate,
          phone: extractedPhone || "N/A",
          email: extractedEmail || "",
          nationality: "UAE",
          idNumber: "N/A",
          licenseNumber: "N/A",
          address: "Dubai",
          clientType: "Resident",
          customerType: "B2C",
          status: "Active",
        });

        return NextResponse.json<AssistantResponse>({
          reply:
            lang === "ar"
              ? `تم إضافة العميل (${newClient.name}) بنجاح وفتح ملفه!`
              : `Added client "${newClient.name}" and opening their profile!`,
          action: "CLIENT_CREATED",
          navigateUrl: `/clients/${newClient._id}`,
          data: {
            type: "clients",
            items: [
              {
                id: newClient._id,
                name: newClient.name,
                phone: newClient.phone || "N/A",
                email: newClient.email || "",
                status: newClient.status || "Active",
              },
            ],
          },
        });
      }

      return NextResponse.json<AssistantResponse>({
        reply:
          lang === "ar"
            ? "حاضر! فتحت لك نافذة إضافة عميل جديد."
            : "Sure! Opening the Add New Customer form for you.",
        action: "OPEN_ADD_CLIENT_MODAL",
        uiAction: "OPEN_ADD_CLIENT_MODAL",
      });
    }

    // =========================================================================
    // 2. FAST MATCH: ADD / CREATE NEW VEHICLE
    // =========================================================================
    const isAddVehicleIntent =
      /(?:add|create|creat|new|register)\s+(?:a\s+)?(?:new\s+)?(?:car|vehicle|unit)/i.test(lower) ||
      lower.includes("add car") ||
      lower.includes("add new car") ||
      lower.includes("add vehicle") ||
      lower.includes("add unit") ||
      message.includes("اضف سيارة") ||
      message.includes("إضافة سيارة") ||
      message.includes("اضافة سيارة") ||
      message.includes("سيارة جديدة") ||
      message.includes("اضف مركبة");

    if (isAddVehicleIntent) {
      return NextResponse.json<AssistantResponse>({
        reply:
          lang === "ar"
            ? "حاضر! فتحت لك نافذة إضافة سيارة جديدة."
            : "Opening the Add New Vehicle form now.",
        action: "OPEN_ADD_UNIT_MODAL",
        uiAction: "OPEN_ADD_UNIT_MODAL",
      });
    }

    // =========================================================================
    // 3. FAST MATCH: CREATE CONTRACT / AUTO-PILOT CONTRACT
    // =========================================================================
    const isCreateContractIntent =
      /(?:create|creat|make|new|start|open|auto)\s+(?:a\s+)?(?:new\s+)?(?:contract|contrac|booking|rental)/i.test(lower) ||
      lower.includes("create contract") ||
      lower.includes("creat contrac") ||
      lower.includes("new contract") ||
      lower.includes("create booking") ||
      lower.includes("new booking") ||
      lower.includes("make contract") ||
      lower.includes("make a contract") ||
      lower.includes("auto contract") ||
      lower.includes("go to contract") ||
      message.includes("عقد جديد") ||
      message.includes("حجز جديد") ||
      message.includes("انشئ عقد") ||
      message.includes("إنشاء عقد") ||
      message.includes("انشاء عقد") ||
      message.includes("سوي عقد") ||
      message.includes("اعمل عقد") ||
      message.includes("فتح عقد");

    if (isCreateContractIntent) {
      const daysMatch = message.match(/(\d+)\s*(?:days?|day|ايام|أيام|يوم)/i);
      const days = daysMatch ? Math.max(1, parseInt(daysMatch[1], 10)) : 3;

      const wantsAuto =
        lower.includes("auto") ||
        lower.includes("himself") ||
        lower.includes("by himself") ||
        lower.includes("now") ||
        lower.includes("direct") ||
        lower.includes("submit") ||
        lower.includes("confirm") ||
        lower.includes("for ") ||
        lower.includes("with ") ||
        message.includes("تلقائي") ||
        message.includes("بنفسه") ||
        message.includes("الآن") ||
        message.includes("فورا") ||
        message.includes("للعميل") ||
        message.includes("بسيارة");

      let matchedClient = allClients.find(
        (c: any) =>
          c.name &&
          c.name.trim().length >= 2 &&
          lower.includes(c.name.toLowerCase().trim())
      );

      let matchedUnit = allUnits.find(
        (u: any) =>
          (u.make && u.make.trim().length >= 2 && lower.includes(u.make.toLowerCase().trim())) ||
          (u.model && u.model.trim().length >= 2 && lower.includes(u.model.toLowerCase().trim())) ||
          (u.plate && u.plate.trim().length >= 2 && lower.includes(u.plate.toLowerCase().trim()))
      );

      const leftover = message
        .replace(/(\d+)\s*(?:days?|day|ايام|أيام|يوم)/gi, "")
        .replace(
          /\b(can you|please|go to|and|create|creat|make|start|open|a|an|new|contract|contrac|booking|rental|auto|automatically|himself|by himself|now|direct|submit|confirm|for|with|client|clint|customer|car|vehicle)\b/gi,
          ""
        )
        .replace(
          /(ممكن|لو سمحت|انشئ|إنشاء|انشاء|سوي|اعمل|افتح|عقد|حجز|جديد|تلقائي|تلقائيا|بنفسه|الآن|فورا|للعميل|عميل|بسيارة|سيارة)/g,
          ""
        )
        .trim();

      if (!matchedClient && leftover.length >= 2) {
        matchedClient = allClients.find(
          (c: any) =>
            c.name?.toLowerCase().includes(leftover.toLowerCase()) ||
            c.phone?.includes(leftover)
        );
      }

      if (!matchedUnit && leftover.length >= 2) {
        matchedUnit = allUnits.find(
          (u: any) =>
            u.make?.toLowerCase().includes(leftover.toLowerCase()) ||
            u.model?.toLowerCase().includes(leftover.toLowerCase()) ||
            u.plate?.toLowerCase().includes(leftover.toLowerCase())
        );
      }

      if (wantsAuto || matchedClient || matchedUnit) {
        const targetClient: any = matchedClient || allClients[0];
        const targetUnit: any =
          matchedUnit ||
          allUnits.find((u: any) => u.status === "Available") ||
          allUnits[0];

        if (targetUnit && targetClient) {
          const params = new URLSearchParams({
            unitId: String(targetUnit._id),
            clientId: String(targetClient._id),
            contractType: "Shop",
            days: String(days),
            autoPilot: "true",
            autoSubmit: "true",
          });

          return NextResponse.json<AssistantResponse>({
            reply:
              lang === "ar"
                ? `حاضر! جاري فتح العقود، واختيار السيارة (${targetUnit.make} ${targetUnit.model}) والعميل (${targetClient.name})، وإنشاء العقد تلقائياً!`
                : `On it! Selecting ${targetUnit.make} ${targetUnit.model} for ${targetClient.name} and creating the contract automatically.`,
            action: "CREATE_CONTRACT",
            navigateUrl: `/bookings/new?${params.toString()}`,
          });
        }
      }

      return NextResponse.json<AssistantResponse>({
        reply:
          lang === "ar"
            ? "حاضر! فتحت لك صفحة إنشاء عقد جديد."
            : "Opening the new contract page for you now.",
        action: "CREATE_CONTRACT",
        navigateUrl: "/bookings/new",
      });
    }

    // =========================================================================
    // 4. INTELLIGENT GROQ AI BRAIN (Understands ANY phrasing, slang, typos, Arabic/English)
    // =========================================================================
    const clientsSummary = allClients
      .slice(0, 15)
      .map((c: any) => `- ID:${c._id} | Name:"${c.name}" | Phone:${c.phone || "N/A"}`)
      .join("\n");

    const unitsSummary = allUnits
      .slice(0, 15)
      .map((u: any) => `- ID:${u._id} | ${u.make} ${u.model} (${u.year}) | Plate:${u.plate} | Status:${u.status} | Rate:${u.dailyRate}`)
      .join("\n");

    const contractsSummary = recentContracts
      .slice(0, 8)
      .map(
        (c: any) =>
          `- Contract #${c.contractNumber || "Pending"} | Client:${(c.clientId as any)?.name || c.personalizedPersonName || "N/A"} | Car:${(c.unitId as any)?.make || ""} ${(c.unitId as any)?.model || ""} | Status:${c.status}`
      )
      .join("\n");

    const systemPrompt = `You are "Leon Assistant", a smart, conversational ChatGPT-style AI assistant built into Leon Rent A Car admin dashboard.
You understand English, Arabic, Franco-Arabic, and typos/broken English effortlessly.
Speak naturally, warmly, and concisely (1-2 short sentences) in the SAME language the user writes in.

LIVE DATABASE CONTEXT:
Fleet Stats: ${totalUnits} total cars, ${availableUnits} Available, ${rentedUnits} Rented, ${activeContractsCount} Active Contracts.
Recent Clients:
${clientsSummary || "None"}
Vehicles:
${unitsSummary || "None"}
Recent Contracts:
${contractsSummary || "None"}

AVAILABLE INTENTS (Return valid JSON ONLY):
You MUST respond with a single raw JSON object (no markdown fences) matching this schema:
{
  "reply": "Your friendly natural response to the user",
  "intent": "NONE" | "NAVIGATE" | "OPEN_CLIENT_DETAILS" | "OPEN_VEHICLE_DETAILS" | "AUTO_CREATE_CONTRACT" | "OPEN_NEW_CONTRACT" | "OPEN_ADD_CLIENT_MODAL" | "ADD_CLIENT_DIRECT" | "OPEN_ADD_UNIT_MODAL" | "CLICK_BUTTON" | "SEARCH_CLIENT" | "SEARCH_VEHICLE" | "FLEET_OVERVIEW",
  "targetUrl": "optional URL if intent is NAVIGATE: '/' | '/bookings' | '/bookings/new' | '/clients' | '/units' | '/drivers' | '/calendar' | '/settings'",
  "clientId": "optional client ID from context if user refers to a client or wants client details",
  "unitId": "optional unit ID from context if user refers to a car or wants car details",
  "clientName": "optional new client name if intent is ADD_CLIENT_DIRECT",
  "clientPhone": "optional new client phone if intent is ADD_CLIENT_DIRECT",
  "searchQuery": "optional search term for SEARCH_CLIENT or SEARCH_VEHICLE",
  "buttonText": "optional button label if intent is CLICK_BUTTON (e.g. 'next', 'back', 'submit')"
}

RULES:
1. If user asks to open/see a client profile or client details (e.g. "open client details", "show me client X", "go to client profile"), set intent="OPEN_CLIENT_DETAILS" and set clientId to the matching client's ID (or the first client's ID if none specified).
2. If user asks to open the clients list page ("go to clients", "show all customers"), set intent="NAVIGATE", targetUrl="/clients".
3. If user asks to add/create a new client without giving a name, set intent="OPEN_ADD_CLIENT_MODAL". If they give a name, set intent="ADD_CLIENT_DIRECT" and fill clientName/clientPhone.
4. If user asks to create/make a contract automatically or for a specific client/car, set intent="AUTO_CREATE_CONTRACT" and fill clientId/unitId if matched. If they just want the new contract page opened, set intent="OPEN_NEW_CONTRACT".
5. If user asks about available cars, fleet count, or stats, set intent="FLEET_OVERVIEW" and answer using the Fleet Stats.
6. If user is just chatting, greeting, or asking a general question (e.g. "hi", "how are you", "what can you do", "who rented the nissan"), set intent="NONE" and give a helpful, conversational reply using the live context.`;

    const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...history.slice(-6).map((h) => ({
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
        const aiReply = parsed.reply || (lang === "ar" ? "تم!" : "Done!");
        const intent = parsed.intent || "NONE";

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

        if (intent === "ADD_CLIENT_DIRECT" && parsed.clientName) {
          const newClient = await Client.create({
            name: parsed.clientName.trim(),
            phone: parsed.clientPhone || "N/A",
            email: "",
            nationality: "UAE",
            idNumber: "N/A",
            licenseNumber: "N/A",
            address: "Dubai",
            clientType: "Resident",
            customerType: "B2C",
            status: "Active",
          });
          return NextResponse.json<AssistantResponse>({
            reply: aiReply,
            action: "CLIENT_CREATED",
            navigateUrl: `/clients/${newClient._id}`,
            data: {
              type: "clients",
              items: [{ id: newClient._id, name: newClient.name, phone: newClient.phone }],
            },
          });
        }

        if (intent === "OPEN_CLIENT_DETAILS") {
          const targetClient: any =
            (parsed.clientId && allClients.find((c: any) => String(c._id) === String(parsed.clientId))) ||
            (parsed.searchQuery &&
              allClients.find((c: any) =>
                c.name?.toLowerCase().includes(String(parsed.searchQuery).toLowerCase())
              )) ||
            allClients[0];

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
            (parsed.unitId && allUnits.find((u: any) => String(u._id) === String(parsed.unitId))) ||
            allUnits[0];

          if (targetUnit) {
            return NextResponse.json<AssistantResponse>({
              reply: aiReply,
              action: "NAVIGATE",
              navigateUrl: `/units/${targetUnit._id}`,
              data: { type: "vehicles", items: [targetUnit] },
            });
          }
        }

        if (intent === "AUTO_CREATE_CONTRACT") {
          const targetClient: any =
            (parsed.clientId && allClients.find((c: any) => String(c._id) === String(parsed.clientId))) ||
            allClients[0];
          const targetUnit: any =
            (parsed.unitId && allUnits.find((u: any) => String(u._id) === String(parsed.unitId))) ||
            allUnits.find((u: any) => u.status === "Available") ||
            allUnits[0];

          if (targetUnit && targetClient) {
            const params = new URLSearchParams({
              unitId: String(targetUnit._id),
              clientId: String(targetClient._id),
              contractType: "Shop",
              days: "3",
              autoPilot: "true",
              autoSubmit: "true",
            });
            return NextResponse.json<AssistantResponse>({
              reply: aiReply,
              action: "CREATE_CONTRACT",
              navigateUrl: `/bookings/new?${params.toString()}`,
            });
          }
        }

        if (intent === "OPEN_NEW_CONTRACT") {
          return NextResponse.json<AssistantResponse>({
            reply: aiReply,
            action: "CREATE_CONTRACT",
            navigateUrl: "/bookings/new",
          });
        }

        if (intent === "NAVIGATE" && parsed.targetUrl) {
          return NextResponse.json<AssistantResponse>({
            reply: aiReply,
            action: "NAVIGATE",
            navigateUrl: parsed.targetUrl,
          });
        }

        if (intent === "CLICK_BUTTON") {
          return NextResponse.json<AssistantResponse>({
            reply: aiReply,
            action: "UI_CLICK",
            uiAction: "CLICK_BUTTON",
            uiTarget: parsed.buttonText || "next",
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
          const matched = allClients
            .filter(
              (c: any) =>
                !q ||
                c.name?.toLowerCase().includes(q) ||
                c.phone?.toLowerCase().includes(q)
            )
            .slice(0, 4);
          return NextResponse.json<AssistantResponse>({
            reply: aiReply,
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
          const q = (parsed.searchQuery || "").toLowerCase();
          const matched = allUnits
            .filter(
              (u: any) =>
                !q ||
                u.make?.toLowerCase().includes(q) ||
                u.model?.toLowerCase().includes(q) ||
                u.plate?.toLowerCase().includes(q)
            )
            .slice(0, 4);
          return NextResponse.json<AssistantResponse>({
            reply: aiReply,
            action: "SEARCH_RESULT",
            data: {
              type: "vehicles",
              items: matched.map((u: any) => ({
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
        // If LLM returned plain text instead of JSON, return it directly as a chat message
        return NextResponse.json<AssistantResponse>({
          reply: rawBrainOutput,
          action: "NONE",
        });
      }
    }

    return NextResponse.json<AssistantResponse>({
      reply:
        lang === "ar"
          ? "أنا معك! أخبرني ماذا تريد أن نفعل؟ (مثلاً: إضافة عميل، إنشاء عقد، أو فتح صفحة عميل)"
          : "I'm here! Tell me what you'd like to do (e.g., create a contract, add a client, or open any page).",
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
