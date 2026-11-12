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
          max_tokens: 1200,
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

interface ContractDetails {
  clientName?: string | null;
  carName?: string | null;
  contractType?: string | null;
  days?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  totalPrice?: number | null;
  dailyRate?: number | null;
  deposit?: number | null;
  advancePayment?: number | null;
  paymentMethod?: string | null;
  pickupLocation?: string | null;
  checkoutTime?: string | null;
}

// Extracts every contract detail (client, car, dates, price, payment...) from a free-form sentence
async function extractContractDetails(message: string, previousUserMessages: string[] = []): Promise<ContractDetails | null> {
  const today = new Date().toISOString().split("T")[0];
  const conversation = previousUserMessages.length
    ? `Earlier messages from the user (context, same contract request):\n${previousUserMessages.map((m) => `- ${m}`).join("\n")}\n\nLatest message: ${message}`
    : message;
  const raw = await callGroqBrain([
    {
      role: "system",
      content: `You extract car-rental contract details from a user's sentence (English, Arabic or mixed, typos allowed).
The user may give the details across several messages: combine earlier messages with the latest one.
Today is ${today}. Return ONE raw JSON object only (no markdown), with these keys (use null when not mentioned, NEVER invent values):
{
  "clientName": string|null,        // existing/named customer, exactly as the user said (e.g. "khalil")
  "carName": string|null,           // make/model and/or plate, e.g. "Nissan Patrol" or "A 12345"
  "contractType": "Shop"|"Delivery"|"Personalized"|null,  // delivery = car delivered to customer by driver; personalized/personal/شخصي/بيرسونالايزد = personal use free contract
  "days": number|null,
  "startDate": "YYYY-MM-DD"|null,   // resolve words like today/tomorrow/Monday using today's date
  "endDate": "YYYY-MM-DD"|null,
  "totalPrice": number|null,        // total rental price if stated ("for 1500", "total 900")
  "dailyRate": number|null,         // per-day price if stated ("200 per day")
  "deposit": number|null,
  "advancePayment": number|null,    // prepaid / advance / عربون
  "paymentMethod": "Cash"|"Card"|"Crypto"|null,
  "pickupLocation": string|null,
  "checkoutTime": string|null       // like "10:00 AM"
}
Words like "new client"/"عميل جديد" mean the client does not exist yet: set clientName to null.`,
    },
    { role: "user", content: conversation },
  ]);
  if (!raw) return null;
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(m ? m[0] : raw);
    const num = (v: any) => (v !== null && v !== undefined && !isNaN(Number(v)) && Number(v) > 0 ? Number(v) : null);
    const str = (v: any) => (typeof v === "string" && v.trim() && v.toLowerCase() !== "null" ? v.trim() : null);
    return {
      clientName: str(parsed.clientName),
      carName: str(parsed.carName),
      contractType: str(parsed.contractType),
      days: num(parsed.days),
      startDate: str(parsed.startDate),
      endDate: str(parsed.endDate),
      totalPrice: num(parsed.totalPrice),
      dailyRate: num(parsed.dailyRate),
      deposit: num(parsed.deposit),
      advancePayment: num(parsed.advancePayment),
      paymentMethod: str(parsed.paymentMethod),
      pickupLocation: str(parsed.pickupLocation),
      checkoutTime: str(parsed.checkoutTime),
    };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = (body.message || "").trim();
    const lower = message.toLowerCase();
    const history: { sender: string; text: string; action?: string }[] = Array.isArray(body.history) ? body.history : [];
    const pathname: string = typeof body.pathname === "string" ? body.pathname : "";
    const currentSearch: string = typeof body.currentSearch === "string" ? body.currentSearch : "";

    // Are we in the middle of a contract conversation? (user is on the new-contract page, or the last assistant step was about a contract)
    const lastAssistantMsg = [...history].reverse().find((h) => h.sender === "assistant");
    const mentionsContractType = /\b(personalized|personal|delivery|shop)\b/i.test(lower) || message.includes("شخصي") || message.includes("توصيل");
    const inContractFlow =
      pathname.startsWith("/bookings/new") || lastAssistantMsg?.action === "CREATE_CONTRACT" || mentionsContractType;
    const previousUserMessages = history
      .filter((h) => h.sender === "user")
      .slice(-3)
      .map((h) => h.text);
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

    // =========================================================================
    // 0. CONTRACT INTENT ALWAYS WINS (e.g. "create new contract for new client")
    // =========================================================================
    const mentionsContract =
      /contract|contrac|booking|rental/i.test(lower) ||
      message.includes("عقد") ||
      message.includes("حجز");

    const mentionsNewClient =
      /new\s+(?:client|clint|customer|custmer)|(?:client|clint|customer|custmer)\s+new/i.test(lower) ||
      message.includes("عميل جديد") ||
      message.includes("زبون جديد") ||
      message.includes("لعميل جديد") ||
      message.includes("لزبون جديد");

    if (mentionsContract && mentionsNewClient) {
      return NextResponse.json<AssistantResponse>({
        reply:
          lang === "ar"
            ? "حاضر! فتحت صفحة العقد الجديد وفتحت نافذة إضافة العميل الجديد، وبعد حفظه سيتم اختياره تلقائياً في العقد."
            : "Sure! Opening the new contract and the Add New Customer form. Once saved, the client will be selected in the contract automatically.",
        action: "CREATE_CONTRACT",
        navigateUrl: "/bookings/new?openAddClient=true",
      });
    }

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

    if (isAddClientIntent && !mentionsContract) {
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
      /(want|need|wanna|book|rent|عايز|ابغى|أبغى|اريد|أريد|ابي|أبي).*(contract|contrac|booking|عقد|حجز)/i.test(lower) ||
      message.includes("عقد جديد") ||
      message.includes("حجز جديد") ||
      message.includes("انشئ عقد") ||
      message.includes("إنشاء عقد") ||
      message.includes("انشاء عقد") ||
      message.includes("سوي عقد") ||
      message.includes("اعمل عقد") ||
      message.includes("فتح عقد");

    if (isCreateContractIntent || inContractFlow) {
      // ---- Smart path: user gave client / car / dates / price / payment details in the sentence ----
      // (also handles follow-ups like "its personalized for khalil" right after "create new contract")
      const details = await extractContractDetails(message, isCreateContractIntent ? [] : previousUserMessages);
      if (details) {
        const [fullClients, fullUnits] = await Promise.all([
          Client.find().select("name phone status").limit(3000).lean(),
          Unit.find().select("make model plate status dailyRate").limit(1000).lean(),
        ]);

        const tokensOf = (s: string) =>
          s
            .toLowerCase()
            .split(/[\s,.-]+/)
            .filter((t) => t.length >= 2);

        const findClient = (q?: string | null) => {
          if (!q || q.trim().length < 2) return null;
          const qt = tokensOf(q);
          return (
            (fullClients as any[]).find((c) => c.name?.toLowerCase().trim() === q.toLowerCase().trim()) ||
            (fullClients as any[]).find((c) => {
              const n = (c.name || "").toLowerCase();
              return qt.length > 0 && qt.every((t) => n.includes(t));
            }) ||
            (fullClients as any[]).find((c) => c.phone && q.replace(/\D/g, "").length >= 6 && c.phone.replace(/\D/g, "").includes(q.replace(/\D/g, ""))) ||
            null
          );
        };

        const findUnit = (q?: string | null) => {
          if (!q || q.trim().length < 2) return null;
          const qt = tokensOf(q);
          const hay = (u: any) => `${u.make || ""} ${u.model || ""} ${u.plate || ""}`.toLowerCase();
          const matches = (fullUnits as any[]).filter((u) => qt.length > 0 && qt.every((t) => hay(u).includes(t)));
          return (
            matches.find((u) => u.status === "Available") ||
            matches[0] ||
            (fullUnits as any[]).find((u) => (u.plate || "").toLowerCase().replace(/\s/g, "") === q.toLowerCase().replace(/\s/g, "")) ||
            null
          );
        };

        let dClient: any = findClient(details.clientName);
        let dUnit: any = findUnit(details.carName);

        // If user asked for "any car" / "first car" / "available car"
        if (
          !dUnit &&
          (/\b(any\s+car|first\s+car|available\s+car|auto)\b/i.test(lower) ||
            message.includes("اي سيارة") ||
            message.includes("أي سيارة") ||
            message.includes("اول سيارة"))
        ) {
          dUnit = (fullUnits as any[]).find((u) => u.status === "Available") || (fullUnits as any[])[0] || null;
        }

        // Preserve any parameters already set on /bookings/new from earlier messages in the conversation
        const existingParams = pathname.startsWith("/bookings/new")
          ? new URLSearchParams(currentSearch)
          : new URLSearchParams();

        if (!dClient && existingParams.get("clientId")) {
          dClient = (fullClients as any[]).find((c) => String(c._id) === existingParams.get("clientId")) || {
            _id: existingParams.get("clientId"),
            name: existingParams.get("clientName") || "Customer",
          };
        }
        if (!dUnit && existingParams.get("unitId")) {
          dUnit = (fullUnits as any[]).find((u) => String(u._id) === existingParams.get("unitId")) || null;
        }

        const hasAnyDetail =
          details.contractType ||
          details.clientName ||
          details.carName ||
          details.totalPrice ||
          details.dailyRate ||
          details.days ||
          details.startDate ||
          details.endDate ||
          details.paymentMethod ||
          details.deposit ||
          details.advancePayment ||
          dUnit;

        if (hasAnyDetail) {
          // If the user gave a specific client name (e.g. "Khalil") that isn't in the DB yet, create that client automatically so it's selected immediately!
          if (details.clientName && !dClient) {
            const createdClient = await Client.create({
              name: details.clientName.trim(),
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
            dClient = createdClient.toObject ? createdClient.toObject() : createdClient;
          }

          const type =
            details.contractType && ["Shop", "Delivery", "Personalized"].includes(details.contractType)
              ? details.contractType
              : (existingParams.get("contractType") as "Shop" | "Delivery" | "Personalized") || "Shop";

          const params = new URLSearchParams(existingParams.toString());
          params.set("contractType", type);
          params.delete("openAddClient");
          params.delete("autoPilot");
          params.delete("autoSubmit");

          if (dClient) {
            params.set("clientId", String(dClient._id));
            if (dClient.name) params.set("clientName", String(dClient.name));
          }
          if (dUnit) params.set("unitId", String(dUnit._id));
          if (details.days) params.set("days", String(details.days));
          if (details.startDate) params.set("startDate", details.startDate);
          if (details.endDate) params.set("endDate", details.endDate);
          if (details.totalPrice) params.set("price", String(details.totalPrice));
          if (details.dailyRate) params.set("dailyRate", String(details.dailyRate));
          if (details.deposit) params.set("deposit", String(details.deposit));
          if (details.advancePayment) params.set("advance", String(details.advancePayment));
          if (details.paymentMethod) params.set("paymentMethod", details.paymentMethod);
          if (details.pickupLocation) params.set("pickupLocation", details.pickupLocation);
          if (details.checkoutTime) params.set("checkoutTime", details.checkoutTime);

          const missing: string[] = [];
          const notFound: string[] = [];
          if (details.carName && !dUnit) notFound.push(lang === "ar" ? `السيارة "${details.carName}"` : `car "${details.carName}"`);
          if (!dClient) missing.push(lang === "ar" ? "العميل" : "client");
          if (!dUnit) missing.push(lang === "ar" ? "السيارة" : "car");

          // Only submit by himself when everything essential is known (Delivery needs a driver, so never auto-submit it)
          const canAutoSubmit = !!dClient && !!dUnit && type !== "Delivery";
          if (canAutoSubmit) {
            params.set("autoPilot", "true");
            params.set("autoSubmit", "true");
          }

          const summary: string[] = [];
          if (type) summary.push(type);
          if (dClient) summary.push(lang === "ar" ? `العميل ${dClient.name}` : `client ${dClient.name}`);
          if (dUnit) summary.push(`${dUnit.make} ${dUnit.model}`);
          if (details.days) summary.push(lang === "ar" ? `${details.days} أيام` : `${details.days} day(s)`);
          if (details.totalPrice) summary.push(lang === "ar" ? `السعر ${details.totalPrice}` : `price ${details.totalPrice}`);
          else if (details.dailyRate) summary.push(lang === "ar" ? `${details.dailyRate} يومياً` : `${details.dailyRate}/day`);
          if (details.paymentMethod) summary.push(details.paymentMethod);

          let reply: string;
          if (canAutoSubmit) {
            reply =
              lang === "ar"
                ? `حاضر! جاري إنشاء العقد تلقائياً (${summary.join("، ")}).`
                : `On it! Creating the contract automatically (${summary.join(", ")}).`;
          } else {
            reply =
              lang === "ar"
                ? `تم ضبط العقد (${summary.join("، ")}).${notFound.length ? ` لم أجد ${notFound.join(" و")}.` : ""} ${type === "Delivery" ? "اختر السائق لإتمام العقد." : `ما هي ${missing.join(" و")} التي تريد اختيارها؟`}`
                : `Set contract to ${summary.join(", ")}.${notFound.length ? ` Couldn't find ${notFound.join(" and ")}.` : ""} ${type === "Delivery" ? "Please pick a driver to finish." : `Which ${missing.join(" and ")} should I select?`}`;
          }

          return NextResponse.json<AssistantResponse>({
            reply,
            action: "CREATE_CONTRACT",
            navigateUrl: `/bookings/new?${params.toString()}`,
          });
        }
      }
    }

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
        message.includes("تلقائي") ||
        message.includes("بنفسه") ||
        message.includes("فورا");

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

      if (wantsAuto || (matchedClient && matchedUnit)) {
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

      // Only part of the info was given: open the contract wizard and prefill what we know (no auto-submit)
      if (matchedClient || matchedUnit) {
        const params = new URLSearchParams({ contractType: "Shop", days: String(days) });
        if (matchedClient) params.set("clientId", String((matchedClient as any)._id));
        if (matchedUnit) params.set("unitId", String((matchedUnit as any)._id));

        const picked =
          lang === "ar"
            ? `${matchedClient ? `العميل (${(matchedClient as any).name})` : ""}${matchedClient && matchedUnit ? " و" : ""}${matchedUnit ? `السيارة (${(matchedUnit as any).make} ${(matchedUnit as any).model})` : ""}`
            : `${matchedClient ? `client ${(matchedClient as any).name}` : ""}${matchedClient && matchedUnit ? " and " : ""}${matchedUnit ? `${(matchedUnit as any).make} ${(matchedUnit as any).model}` : ""}`;

        return NextResponse.json<AssistantResponse>({
          reply:
            lang === "ar"
              ? `حاضر! فتحت العقد الجديد واخترت ${picked}. أكمل باقي البيانات.`
              : `Opening a new contract with ${picked} selected. Complete the remaining details.`,
          action: "CREATE_CONTRACT",
          navigateUrl: `/bookings/new?${params.toString()}`,
        });
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
  "intent": "NONE" | "NAVIGATE" | "OPEN_CLIENT_DETAILS" | "OPEN_VEHICLE_DETAILS" | "AUTO_CREATE_CONTRACT" | "OPEN_NEW_CONTRACT" | "OPEN_NEW_CONTRACT_NEW_CLIENT" | "OPEN_ADD_CLIENT_MODAL" | "ADD_CLIENT_DIRECT" | "OPEN_ADD_UNIT_MODAL" | "CLICK_BUTTON" | "SEARCH_CLIENT" | "SEARCH_VEHICLE" | "FLEET_OVERVIEW",
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
6. If user is just chatting, greeting, or asking a general question (e.g. "hi", "how are you", "what can you do", "who rented the nissan"), set intent="NONE" and give a helpful, conversational reply using the live context.
7. CRITICAL: If the user mentions a contract/booking/rental together with a NEW client (e.g. "create a contract for a new client"), the goal is a CONTRACT, never just a client. Set intent="OPEN_NEW_CONTRACT_NEW_CLIENT". NEVER choose ADD_CLIENT_DIRECT or OPEN_ADD_CLIENT_MODAL when a contract is mentioned.
8. Use ADD_CLIENT_DIRECT only when the user explicitly asks to add a client AND gives a real person name. Never invent names; if unsure, ask a short clarifying question with intent="NONE".
9. Never pick a random client or car for a contract unless the user says "auto"/"automatically" or names them; otherwise use OPEN_NEW_CONTRACT and ask what's missing.
10. NEVER claim you are opening/creating/adding something in "reply" unless the "intent" actually performs it. If you can't perform it, say so honestly or ask what you need, with intent="NONE".
11. The user is currently on page: ${pathname || "unknown"}${inContractFlow ? " (they are in the middle of creating a contract; short follow-ups like names, car, price or dates belong to that contract)" : ""}.`;

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
        let intent = parsed.intent || "NONE";

        // Safety net: a contract request must never be turned into a plain "add client"
        if (mentionsContract && (intent === "ADD_CLIENT_DIRECT" || intent === "OPEN_ADD_CLIENT_MODAL")) {
          intent = mentionsNewClient ? "OPEN_NEW_CONTRACT_NEW_CLIENT" : "OPEN_NEW_CONTRACT";
        }

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

        if (intent === "OPEN_NEW_CONTRACT_NEW_CLIENT") {
          return NextResponse.json<AssistantResponse>({
            reply: aiReply,
            action: "CREATE_CONTRACT",
            navigateUrl: "/bookings/new?openAddClient=true",
          });
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
