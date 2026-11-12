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

// Fallback LLM caller using Groq
async function callGroqLLM(prompt: string, systemPrompt: string): Promise<string | null> {
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
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 300,
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
    const lang = body.lang || (message.match(/[\u0600-\u06FF]/) ? "ar" : "en");

    if (!message) {
      return NextResponse.json<AssistantResponse>({
        reply: lang === "ar" ? "أهلاً بك! كيف يمكنني مساعدتك اليوم؟" : "Hello! How can I assist you today?",
        action: "NONE",
      });
    }

    await connectDB();

    const lower = message.toLowerCase();

    // =========================================================================
    // 1. ADD / CREATE NEW CLIENT OR COMPANY (Direct DB creation OR Modal Open)
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
            ? "حاضر! جاري فتح نافذة إضافة شركة جديدة (B2B) الآن..."
            : "Opening the Add Company (B2B) form for you now...",
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
      // Extract phone or email if the user spoke/typed them
      const phoneMatch = message.match(/(?:\+?\d[\d\s-]{6,14}\d)/);
      const extractedPhone = phoneMatch ? phoneMatch[0].replace(/\s+/g, "").trim() : "";

      const emailMatch = message.match(/\S+@\S+\.\S+/);
      const extractedEmail = emailMatch ? emailMatch[0].trim() : "";

      let nameCandidate = message
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
              ? `تم إضافة العميل الجديد (${newClient.name}) بنجاح! جاري فتح صفحة تفاصيل العميل الآن...`
              : `Successfully added new client "${newClient.name}"! Opening their profile page now...`,
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

      // If no specific name was provided, immediately pop open the Add New Customer modal
      return NextResponse.json<AssistantResponse>({
        reply:
          lang === "ar"
            ? "حاضر! جاري فتح نافذة إضافة عميل جديد (Add New Customer) الآن..."
            : "Opening the Add New Customer modal for you right now...",
        action: "OPEN_ADD_CLIENT_MODAL",
        uiAction: "OPEN_ADD_CLIENT_MODAL",
      });
    }

    // =========================================================================
    // 2. ADD / CREATE NEW VEHICLE / CAR (Modal Open)
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
            ? "حاضر! جاري فتح نافذة إضافة سيارة جديدة للأسطول الآن..."
            : "Opening the Add New Vehicle modal for you right now...",
        action: "OPEN_ADD_UNIT_MODAL",
        uiAction: "OPEN_ADD_UNIT_MODAL",
      });
    }

    // =========================================================================
    // 3. CREATE NEW CONTRACT / AUTO-PILOT CONTRACT CREATION
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

      // Search all clients & units to see if user mentioned a specific client or car in the sentence
      const [allClients, allUnits] = await Promise.all([
        Client.find({ status: "Active" }).sort({ updatedAt: -1 }).limit(100).lean(),
        Unit.find().sort({ updatedAt: -1 }).limit(100).lean(),
      ]);

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

      // If not found by exact full-name substring, check leftover words
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
                ? `حاضر! جاري الذهاب إلى صفحة العقود، واختيار السيارة (${targetUnit.make} ${targetUnit.model}) والعميل (${targetClient.name})، وإنشاء العقد تلقائياً الآن...`
                : `Going to contracts, selecting ${targetUnit.make} ${targetUnit.model} and customer ${targetClient.name}, and creating the contract automatically now...`,
            action: "CREATE_CONTRACT",
            navigateUrl: `/bookings/new?${params.toString()}`,
          });
        }
      }

      return NextResponse.json<AssistantResponse>({
        reply:
          lang === "ar"
            ? "حاضر! جاري فتح صفحة إنشاء عقد جديد الآن..."
            : "Opening the new contract booking page for you now...",
        action: "CREATE_CONTRACT",
        navigateUrl: "/bookings/new",
      });
    }

    // =========================================================================
    // 4. UI BUTTON CLICK COMMANDS (Click Next, Back, Submit, etc.)
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

    // =========================================================================
    // 5. OPEN / NAVIGATE / DETAILS INTENTS
    // =========================================================================
    const hasOpenOrDetails =
      lower.includes("open") ||
      lower.includes("go to") ||
      lower.includes("show") ||
      lower.includes("view") ||
      lower.includes("navigate") ||
      lower.includes("take me to") ||
      lower.includes("details") ||
      lower.includes("profile") ||
      lower.includes("page") ||
      message.includes("افتح") ||
      message.includes("عرض") ||
      message.includes("تفاصيل") ||
      message.includes("صفحة") ||
      message.includes("ملف") ||
      message.includes("روح") ||
      message.includes("انتقل") ||
      message.includes("وديني") ||
      message.includes("وريني") ||
      message.includes("بيانات");

    // CLIENT PAGE / CLIENT DETAILS NAVIGATION
    const isClientIntent =
      lower.includes("client") ||
      lower.includes("clint") ||
      lower.includes("customer") ||
      lower.includes("custmer") ||
      message.includes("عميل") ||
      message.includes("العميل") ||
      message.includes("العملاء") ||
      message.includes("زبون") ||
      message.includes("الزبائن");

    if (isClientIntent && hasOpenOrDetails) {
      const wantsDetails =
        lower.includes("details") ||
        lower.includes("profile") ||
        lower.includes("page details") ||
        message.includes("تفاصيل") ||
        message.includes("ملف") ||
        message.includes("بيانات");

      const cleaned = message
        .replace(
          /can you|please|i told you to|i told him to|i want to|open a client page details|open client page details|open a client page|open client page|open a client details|open client details|open client|show client|view client|client page details|client details|details of|details for|client|clint|customer|custmer|page|details|profile/gi,
          ""
        )
        .replace(
          /افتح صفحة تفاصيل العميل|افتح تفاصيل العميل|افتح صفحة العميل|عرض تفاصيل العميل|تفاصيل العميل|صفحة العميل|بيانات العميل|ملف العميل|العملاء|العميل|عميل/gi,
          ""
        )
        .trim();

      if (cleaned.length >= 2) {
        const matchedClient = await Client.findOne({
          $or: [
            { name: { $regex: cleaned, $options: "i" } },
            { phone: { $regex: cleaned, $options: "i" } },
            { email: { $regex: cleaned, $options: "i" } },
            { idNumber: { $regex: cleaned, $options: "i" } },
          ],
        }).lean();

        if (matchedClient) {
          return NextResponse.json<AssistantResponse>({
            reply:
              lang === "ar"
                ? `جاري فتح صفحة تفاصيل العميل (${matchedClient.name})...`
                : `Opening details page for client ${matchedClient.name}...`,
            action: "NAVIGATE",
            navigateUrl: `/clients/${matchedClient._id}`,
            data: {
              type: "clients",
              items: [matchedClient],
            },
          });
        }
      }

      if (wantsDetails) {
        const latestClient = await Client.findOne().sort({ updatedAt: -1 }).lean();
        if (latestClient) {
          return NextResponse.json<AssistantResponse>({
            reply:
              lang === "ar"
                ? `جاري فتح صفحة تفاصيل العميل (${latestClient.name})...`
                : `Opening client details page for ${latestClient.name}...`,
            action: "NAVIGATE",
            navigateUrl: `/clients/${latestClient._id}`,
            data: {
              type: "clients",
              items: [latestClient],
            },
          });
        }
      }

      return NextResponse.json<AssistantResponse>({
        reply:
          lang === "ar"
            ? "جاري فتح صفحة قائمة العملاء..."
            : "Opening the Clients directory...",
        action: "NAVIGATE",
        navigateUrl: "/clients",
      });
    }

    // VEHICLE / CAR DETAILS OR FLEET PAGE NAVIGATION
    const isVehicleIntent =
      lower.includes("car") ||
      lower.includes("cars") ||
      lower.includes("vehicle") ||
      lower.includes("vehicles") ||
      lower.includes("unit") ||
      lower.includes("units") ||
      lower.includes("fleet") ||
      message.includes("سيارة") ||
      message.includes("السيارات") ||
      message.includes("الأسطول") ||
      message.includes("مركبة") ||
      message.includes("مركبات");

    if (isVehicleIntent && hasOpenOrDetails) {
      const wantsDetails =
        lower.includes("details") ||
        lower.includes("page details") ||
        message.includes("تفاصيل") ||
        message.includes("بيانات");

      const cleaned = message
        .replace(
          /can you|please|open car details|open vehicle details|open car page details|open car page|open car|show car|view car|car details|vehicle details|details of|details for|car|cars|vehicle|vehicles|fleet|unit|units|page|details/gi,
          ""
        )
        .replace(
          /افتح صفحة تفاصيل السيارة|افتح تفاصيل السيارة|افتح صفحة السيارات|عرض تفاصيل السيارة|تفاصيل السيارة|صفحة السيارة|بيانات السيارة|السيارات|السيارة|سيارة|أسطول/gi,
          ""
        )
        .trim();

      if (cleaned.length >= 2) {
        const matchedUnit = await Unit.findOne({
          $or: [
            { plate: { $regex: cleaned, $options: "i" } },
            { make: { $regex: cleaned, $options: "i" } },
            { model: { $regex: cleaned, $options: "i" } },
          ],
        }).lean();

        if (matchedUnit) {
          return NextResponse.json<AssistantResponse>({
            reply:
              lang === "ar"
                ? `جاري فتح صفحة تفاصيل السيارة (${matchedUnit.make} ${matchedUnit.model})...`
                : `Opening vehicle details for ${matchedUnit.make} ${matchedUnit.model}...`,
            action: "NAVIGATE",
            navigateUrl: `/units/${matchedUnit._id}`,
            data: {
              type: "vehicles",
              items: [matchedUnit],
            },
          });
        }
      }

      if (wantsDetails) {
        const latestUnit = await Unit.findOne().sort({ updatedAt: -1 }).lean();
        if (latestUnit) {
          return NextResponse.json<AssistantResponse>({
            reply:
              lang === "ar"
                ? `جاري فتح صفحة تفاصيل السيارة (${latestUnit.make} ${latestUnit.model})...`
                : `Opening vehicle details for ${latestUnit.make} ${latestUnit.model}...`,
            action: "NAVIGATE",
            navigateUrl: `/units/${latestUnit._id}`,
            data: {
              type: "vehicles",
              items: [latestUnit],
            },
          });
        }
      }

      return NextResponse.json<AssistantResponse>({
        reply:
          lang === "ar"
            ? "جاري فتح صفحة أسطول السيارات..."
            : "Opening the Vehicles Fleet...",
        action: "NAVIGATE",
        navigateUrl: "/units",
      });
    }

    // OTHER NAVIGATION COMMANDS (Calendar, Bookings, Drivers, Settings, Dashboard)
    if (hasOpenOrDetails) {
      if (
        lower.includes("calendar") ||
        lower.includes("schedule") ||
        message.includes("التقويم") ||
        message.includes("تقويم") ||
        message.includes("مواعيد") ||
        message.includes("جدول")
      ) {
        return NextResponse.json<AssistantResponse>({
          reply: lang === "ar" ? "جاري فتح صفحة التقويم والمواعيد..." : "Opening the Calendar...",
          action: "NAVIGATE",
          navigateUrl: "/calendar",
        });
      }

      if (
        lower.includes("booking") ||
        lower.includes("contract") ||
        lower.includes("contrac") ||
        message.includes("الحجوزات") ||
        message.includes("العقود") ||
        message.includes("حجز")
      ) {
        return NextResponse.json<AssistantResponse>({
          reply: lang === "ar" ? "جاري فتح صفحة الحجوزات والعقود..." : "Opening Bookings & Contracts...",
          action: "NAVIGATE",
          navigateUrl: "/bookings",
        });
      }

      if (
        lower.includes("driver") ||
        lower.includes("drivers") ||
        message.includes("السائقين") ||
        message.includes("سائق")
      ) {
        return NextResponse.json<AssistantResponse>({
          reply: lang === "ar" ? "جاري الانتقال إلى إدارة السائقين..." : "Opening Drivers management...",
          action: "NAVIGATE",
          navigateUrl: "/drivers",
        });
      }

      if (
        lower.includes("setting") ||
        lower.includes("settings") ||
        lower.includes("whatsapp") ||
        message.includes("الإعدادات") ||
        message.includes("اعدادات") ||
        message.includes("واتساب")
      ) {
        return NextResponse.json<AssistantResponse>({
          reply: lang === "ar" ? "جاري فتح صفحة الإعدادات وبوابة الواتساب..." : "Opening Settings & WhatsApp Gateway...",
          action: "NAVIGATE",
          navigateUrl: "/settings",
        });
      }

      if (
        lower.includes("dashboard") ||
        lower.includes("home") ||
        message.includes("الرئيسية") ||
        message.includes("لوحة التحكم")
      ) {
        return NextResponse.json<AssistantResponse>({
          reply: lang === "ar" ? "جاري التوجه إلى لوحة التحكم الرئيسية..." : "Opening Dashboard Overview...",
          action: "NAVIGATE",
          navigateUrl: "/",
        });
      }
    }

    // =========================================================================
    // 6. OVERVIEW / FLEET STATS COMMANDS
    // =========================================================================
    if (
      lower.includes("how many") ||
      lower.includes("available cars") ||
      lower.includes("fleet status") ||
      lower.includes("overview") ||
      lower.includes("stats") ||
      message.includes("كم سيارة") ||
      message.includes("السيارات المتوفرة") ||
      message.includes("كم عقد") ||
      message.includes("إحصائيات") ||
      message.includes("احصائيات") ||
      message.includes("حالة الأسطول")
    ) {
      const [totalUnits, availableUnits, rentedUnits, maintenanceUnits, activeContracts] = await Promise.all([
        Unit.countDocuments(),
        Unit.countDocuments({ status: "Available" }),
        Unit.countDocuments({ status: "Rented" }),
        Unit.countDocuments({ status: "Maintenance" }),
        Contract.countDocuments({ status: "Active" }),
      ]);

      const reply =
        lang === "ar"
          ? `حالة الأسطول الحالية: يوجد إجمالي ${totalUnits} سيارة، منها ${availableUnits} سيارة متوفرة وجاهزة للتأجير، و ${rentedUnits} مؤجرة حالياً، بالإضافة إلى ${activeContracts} عقد نشط.`
          : `Fleet status overview: ${totalUnits} total vehicles, with ${availableUnits} available for rent, ${rentedUnits} currently rented, and ${activeContracts} active contracts.`;

      return NextResponse.json<AssistantResponse>({
        reply,
        action: "OVERVIEW",
        data: {
          type: "overview",
          stats: {
            totalUnits,
            availableUnits,
            rentedUnits,
            maintenanceUnits,
            activeContracts,
          },
        },
      });
    }

    // =========================================================================
    // 7. SEARCH FOR CLIENT / PERSON
    // =========================================================================
    const isClientSearch =
      lower.includes("search for") ||
      lower.includes("find client") ||
      lower.includes("find customer") ||
      lower.includes("search client") ||
      lower.includes("who is") ||
      message.includes("ابحث عن") ||
      message.includes("بحث عن") ||
      message.includes("مين هو") ||
      message.includes("من هو") ||
      message.includes("معلومات العميل");

    const cleanQuery = message
      .replace(/search for|find client|find customer|search client|who is/gi, "")
      .replace(/ابحث عن عميل|ابحث عن|بحث عن|مين هو|من هو|معلومات العميل|عميل/gi, "")
      .trim();

    if (isClientSearch && cleanQuery.length >= 2) {
      const clients = await Client.find({
        $or: [
          { name: { $regex: cleanQuery, $options: "i" } },
          { phone: { $regex: cleanQuery, $options: "i" } },
          { email: { $regex: cleanQuery, $options: "i" } },
          { idNumber: { $regex: cleanQuery, $options: "i" } },
        ],
      })
        .limit(5)
        .lean();

      if (clients.length > 0) {
        const reply =
          lang === "ar"
            ? `عثرت على ${clients.length} عميل يطابق بحثك عن "${cleanQuery}". تفضل النتائج:`
            : `Found ${clients.length} client(s) matching "${cleanQuery}". Here are the details:`;

        return NextResponse.json<AssistantResponse>({
          reply,
          action: "SEARCH_RESULT",
          data: {
            type: "clients",
            items: clients.map((c: any) => ({
              id: c._id,
              name: c.name,
              phone: c.phone || "No phone",
              email: c.email || "",
              status: c.status || "Active",
              clientType: c.clientType || "Resident",
              idNumber: c.idNumber || c.passportNumber || "",
            })),
          },
        });
      }
    }

    // =========================================================================
    // 8. SEARCH FOR VEHICLE / PLATE
    // =========================================================================
    const isVehicleSearch =
      lower.includes("plate") ||
      lower.includes("find car") ||
      lower.includes("search car") ||
      message.includes("لوحة");

    if (isVehicleSearch && cleanQuery.length >= 2) {
      const vehicleQuery = cleanQuery
        .replace(/plate|car|vehicle|لوحة|سيارة|مركبة/gi, "")
        .trim();

      const searchTarget = vehicleQuery.length >= 2 ? vehicleQuery : cleanQuery;

      const units = await Unit.find({
        $or: [
          { plate: { $regex: searchTarget, $options: "i" } },
          { make: { $regex: searchTarget, $options: "i" } },
          { model: { $regex: searchTarget, $options: "i" } },
        ],
      })
        .limit(5)
        .lean();

      if (units.length > 0) {
        const reply =
          lang === "ar"
            ? `عثرت على ${units.length} سيارة تطابق "${searchTarget}". تفضل التفاصيل:`
            : `Found ${units.length} vehicle(s) matching "${searchTarget}". Here are the details:`;

        return NextResponse.json<AssistantResponse>({
          reply,
          action: "SEARCH_RESULT",
          data: {
            type: "vehicles",
            items: units.map((u: any) => ({
              id: u._id,
              title: `${u.make} ${u.model} (${u.year})`,
              plate: u.plate,
              color: u.color,
              status: u.status,
              dailyRate: u.dailyRate,
              mileage: u.mileage,
              image: u.images?.[0] || null,
            })),
          },
        });
      }
    }

    // =========================================================================
    // 9. SEARCH CONTRACTS BY NUMBER OR NAME
    // =========================================================================
    if (cleanQuery.length >= 2) {
      const contractNum = Number(cleanQuery.replace(/[^0-9]/g, ""));
      const queryConds: any[] = [];
      if (!isNaN(contractNum) && contractNum > 0) {
        queryConds.push({ contractNumber: contractNum });
      }
      queryConds.push({ "clientId.name": { $regex: cleanQuery, $options: "i" } });
      queryConds.push({ personalizedPersonName: { $regex: cleanQuery, $options: "i" } });

      const contracts = await Contract.find({ $or: queryConds })
        .populate("clientId", "name phone")
        .populate("unitId", "make model plate")
        .limit(3)
        .lean();

      if (contracts.length > 0) {
        const reply =
          lang === "ar"
            ? `عثرت على عقد يطابق "${cleanQuery}". تفضل التفاصيل أدناه:`
            : `Found contract(s) matching "${cleanQuery}":`;

        return NextResponse.json<AssistantResponse>({
          reply,
          action: "SEARCH_RESULT",
          data: {
            type: "contracts",
            items: contracts.map((c: any) => ({
              id: c._id,
              contractNumber: c.contractNumber || c._id?.toString().slice(-6),
              customer: (c.clientId as any)?.name || c.personalizedPersonName || "Customer",
              vehicle: (c.unitId as any)
                ? `${(c.unitId as any).make} ${(c.unitId as any).model} (${(c.unitId as any).plate})`
                : "Vehicle",
              status: c.status,
              deliveryStatus: c.deliveryStatus,
              startDate: c.startDate,
              endDate: c.endDate,
              totalAmount: c.totalAmount || 0,
            })),
          },
        });
      }
    }

    // =========================================================================
    // 10. INTELLIGENT AI CONVERSATION (Using Groq LLM)
    // =========================================================================
    const systemPrompt = `You are "Leon Assistant", the high-tech, courteous and efficient Voice AI Assistant for Leon Rent A Car in Dubai/UAE.
You assist the rental agency admin with fleet management, bookings, clients, and vehicle inquiries.
Answer concisely (1-3 sentences maximum) in friendly spoken ${lang === "ar" ? "Arabic (لهجة مهذبة مفهومة)" : "English"}.
If asked what you can do, explain that you can automatically create contracts, add new clients directly, open client or car details, click buttons, and navigate anywhere in the dashboard.`;

    const aiReply = await callGroqLLM(message, systemPrompt);

    if (aiReply) {
      return NextResponse.json<AssistantResponse>({
        reply: aiReply,
        action: "NONE",
      });
    }

    return NextResponse.json<AssistantResponse>({
      reply:
        lang === "ar"
          ? "أنا مساعد ليون الذكي. يمكنني إنشاء عقود تلقائياً، إضافة عملاء جدد، فتح صفحات تفاصيل العملاء والسيارات، والانتقال لأي صفحة ترغب بها!"
          : "I am Leon Assistant. I can auto-create contracts, add new clients, open client or vehicle details, and navigate anywhere in the system!",
      action: "NONE",
    });
  } catch (error: any) {
    console.error("AI Assistant API error:", error);
    return NextResponse.json(
      {
        reply: "عذراً، حدث خطأ أثناء المعالجة. يرجى المحاولة مرة أخرى.",
        action: "NONE",
      },
      { status: 500 }
    );
  }
}
