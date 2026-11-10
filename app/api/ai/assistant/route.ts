export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Client } from "@/models/Client";
import { Unit } from "@/models/Unit";
import { Contract } from "@/models/Contract";

interface AssistantResponse {
  reply: string;
  action?: "NAVIGATE" | "CREATE_CONTRACT" | "SEARCH_RESULT" | "OVERVIEW" | "NONE";
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
      return NextResponse.json({
        reply: lang === "ar" ? "أهلاً بك! كيف يمكنني مساعدتك اليوم؟" : "Hello! How can I assist you today?",
        action: "NONE",
      });
    }

    await connectDB();

    const lower = message.toLowerCase();

    // 1. CREATE NEW CONTRACT
    if (
      lower.includes("create contract") ||
      lower.includes("new contract") ||
      lower.includes("create booking") ||
      lower.includes("new booking") ||
      message.includes("عقد جديد") ||
      message.includes("حجز جديد") ||
      message.includes("انشئ عقد") ||
      message.includes("سوي عقد") ||
      message.includes("اعمل عقد") ||
      message.includes("فتح عقد")
    ) {
      return NextResponse.json<AssistantResponse>({
        reply:
          lang === "ar"
            ? "حاضر! جاري فتح صفحة إنشاء عقد جديد الآن..."
            : "Opening the new contract booking page for you now...",
        action: "CREATE_CONTRACT",
        navigateUrl: "/bookings/new",
      });
    }

    // 2. NAVIGATION COMMANDS
    const navMap: { keywords: string[]; url: string; replyAr: string; replyEn: string }[] = [
      {
        keywords: ["calendar", "التقويم", "مواعيد", "جدول"],
        url: "/calendar",
        replyAr: "جاري فتح صفحة التقويم والمواعيد...",
        replyEn: "Navigating to Calendar...",
      },
      {
        keywords: ["booking", "contract", "الحجوزات", "العقود", "حجوزات"],
        url: "/bookings",
        replyAr: "جاري الانتقال إلى قائمة الحجوزات والعقود...",
        replyEn: "Navigating to Bookings & Contracts...",
      },
      {
        keywords: ["client", "customer", "العملاء", "الزبائن", "عميل"],
        url: "/clients",
        replyAr: "جاري فتح صفحة إدارة العملاء...",
        replyEn: "Navigating to Clients directory...",
      },
      {
        keywords: ["car", "cars", "unit", "units", "fleet", "السيارات", "الأسطول", "سيارات"],
        url: "/units",
        replyAr: "جاري فتح صفحة أسطول السيارات...",
        replyEn: "Navigating to Vehicle Fleet...",
      },
      {
        keywords: ["driver", "drivers", "السائقين", "سائق"],
        url: "/drivers",
        replyAr: "جاري الانتقال إلى إدارة السائقين...",
        replyEn: "Navigating to Drivers management...",
      },
      {
        keywords: ["setting", "settings", "whatsapp", "الإعدادات", "اعدادات", "واتساب"],
        url: "/settings",
        replyAr: "جاري فتح صفحة الإعدادات وبوابة الواتساب...",
        replyEn: "Opening Settings & WhatsApp Gateway...",
      },
      {
        keywords: ["dashboard", "home", "الرئيسية", "لوحة التحكم"],
        url: "/",
        replyAr: "جاري التوجه إلى لوحة التحكم الرئيسية...",
        replyEn: "Going to Dashboard Overview...",
      },
    ];

    if (
      lower.startsWith("go to") ||
      lower.startsWith("open") ||
      lower.startsWith("show") ||
      message.startsWith("افتح") ||
      message.startsWith("روح") ||
      message.startsWith("انتقل") ||
      message.startsWith("عرض")
    ) {
      for (const item of navMap) {
        if (item.keywords.some((k) => lower.includes(k) || message.includes(k))) {
          return NextResponse.json<AssistantResponse>({
            reply: lang === "ar" ? item.replyAr : item.replyEn,
            action: "NAVIGATE",
            navigateUrl: item.url,
          });
        }
      }
    }

    // 3. OVERVIEW / FLEET STATS COMMANDS
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

    // 4. SEARCH FOR CLIENT / PERSON
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
      message.includes("معلومات العميل") ||
      message.includes("عميل");

    // Clean search term
    let cleanQuery = message
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

    // 5. SEARCH FOR VEHICLE / PLATE
    const isVehicleSearch =
      lower.includes("plate") ||
      lower.includes("car") ||
      lower.includes("find car") ||
      lower.includes("search car") ||
      lower.includes("vehicle") ||
      message.includes("لوحة") ||
      message.includes("سيارة") ||
      message.includes("مركبة");

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

    // 6. SEARCH CONTRACTS BY NUMBER OR NAME
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
              vehicle: (c.unitId as any) ? `${(c.unitId as any).make} ${(c.unitId as any).model} (${(c.unitId as any).plate})` : "Vehicle",
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

    // 7. INTELLIGENT AI CONVERSATION (Using Groq LLM)
    const systemPrompt = `You are "Leon Siri", the high-tech, courteous and efficient Voice AI Assistant for Leon Rent A Car in Dubai/UAE.
You assist the rental agency admin with fleet management, bookings, clients, and vehicle inquiries.
Answer concisely (1-3 sentences maximum) in friendly spoken ${lang === "ar" ? "Arabic (لهجة مهذبة مفهومة)" : "English"}.
If asked what you can do, explain that you can create new contracts, search for clients, check car availability, search contracts, and navigate anywhere in the dashboard.`;

    const aiReply = await callGroqLLM(message, systemPrompt);

    if (aiReply) {
      return NextResponse.json<AssistantResponse>({
        reply: aiReply,
        action: "NONE",
      });
    }

    // Fallback response if offline
    return NextResponse.json<AssistantResponse>({
      reply:
        lang === "ar"
          ? "أنا مساعد ليون الصوتي الذكي. يمكنني إنشاء عقود جديدة، البحث عن عميل أو سيارة، عرض إحصائيات الأسطول، أو فتح أي صفحة ترغب بها!"
          : "I am Leon Voice Assistant. I can help you create new contracts, search clients or cars, view fleet statistics, and navigate through the system!",
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

