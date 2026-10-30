import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Notification } from "@/models/Notification";
import { Contract } from "@/models/Contract";
import "@/models/Unit";
import "@/models/Client";
import { sendHandoverReminderNotification } from "@/lib/contract-notifications";

export const dynamic = "force-dynamic";

// The reminder scan is idempotent (atomic claim per contract), so it does not need to run
// on every poll. Throttle it to once every few minutes per server process.
const REMINDER_CHECK_INTERVAL_MS = 5 * 60 * 1000;

async function checkUpcomingHandoverReminders() {
  const g = globalThis as any;
  const nowTs = Date.now();
  if (g.__lastHandoverReminderCheck && nowTs - g.__lastHandoverReminderCheck < REMINDER_CHECK_INTERVAL_MS) {
    return;
  }
  g.__lastHandoverReminderCheck = nowTs;

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);

    // Find contracts starting today or tomorrow that haven't been delivered/completed/cancelled
    const upcomingContracts = await Contract.find({
      startDate: { $gte: todayStart, $lte: tomorrowEnd },
      status: { $ne: "Cancelled" },
      deliveryStatus: { $ne: "Delivered" },
    })
      .populate({ path: "unitId", select: "make model plate", strictPopulate: false })
      .populate({ path: "clientId", select: "name", strictPopulate: false })
      .lean();

    for (const contract of upcomingContracts) {
      const contractNum = contract.contractNumber 
        ? `#${contract.contractNumber}` 
        : `#${contract._id.toString().substring(0, 8).toUpperCase()}`;

      const contractStartDate = new Date(contract.startDate);
      const isTomorrow = contractStartDate >= tomorrowStart && contractStartDate <= tomorrowEnd;
      const timingLabel = isTomorrow ? "Tomorrow" : "Today";

      // Atomically claim the reminder for this contract/timing so it is only ever sent once
      const flagField = isTomorrow ? "reminderSentTomorrow" : "reminderSentToday";
      const claimed = await Contract.findOneAndUpdate(
        { _id: contract._id, [flagField]: { $ne: true } },
        { $set: { [flagField]: true } }
      );

      if (claimed) {
        const vehicle = (contract.unitId as any)?.make 
          ? `${(contract.unitId as any).make} ${(contract.unitId as any).model || ""} (${(contract.unitId as any).plate || ""})`.trim()
          : "Vehicle";
        const client = (contract.clientId as any)?.name || (contract as any).additionalDriverName || "Client";
        const dateFormatted = contractStartDate.toLocaleDateString("en-GB", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });

        await Notification.create({
          title: `Handover Reminder (${timingLabel}): ${client} — ${vehicle}`,
          message: `Scheduled vehicle handover for ${client} (${vehicle}) starts ${timingLabel.toLowerCase()} (${dateFormatted}). Please ensure vehicle is ready for delivery.`,
          type: "reminder",
          read: false,
        });

        // Also send automated Gmail + WhatsApp to Admin
        sendHandoverReminderNotification(contract._id.toString(), timingLabel).catch((dispatchErr) => {
          console.error("Failed to dispatch Gmail/WhatsApp handover reminder:", dispatchErr);
        });
      }
    }
  } catch (reminderErr) {
    console.error("Error generating handover reminders:", reminderErr);
  }
}

export async function GET(req: Request) {
  try {
    await connectDB();
    await checkUpcomingHandoverReminders();

    // Lightweight mode used by the header/sidebar badge: return only the unread count.
    const { searchParams } = new URL(req.url);
    if (searchParams.get("countOnly") === "true") {
      const unread = await Notification.countDocuments({ read: false });
      return NextResponse.json({ unread });
    }

    const rawNotifications = await Notification.find({}).sort({ createdAt: -1 }).lean();
    const sanitized = rawNotifications.map((n: any) => {
      let msg = n.message || "";
      msg = msg
        .replace(/Contract\s*#?[A-Z0-9_-]+\s*was created\./gi, "New booking was created.")
        .replace(/Contract\s*#?[A-Z0-9_-]+\s*was dispatched to/gi, "Vehicle was dispatched to")
        .replace(/Vehicle for contract\s*#?[A-Z0-9_-]+\s*delivered to/gi, "Vehicle delivered to")
        .replace(/Contract\s*#?[A-Z0-9_-]+\s*was returned/gi, "Vehicle was returned")
        .replace(/for contract\s*#?[A-Z0-9_-]+/gi, "")
        .replace(/linked them to contract\s*#?[A-Z0-9_-]+/gi, "linked them to the booking")
        .replace(/Contract\s*#?[A-Z0-9_-]+/gi, "Contract")
        .replace(/\s{2,}/g, " ")
        .trim();

      return {
        ...n,
        message: msg,
      };
    });
    return NextResponse.json(sanitized);
  } catch (error: any) {
    console.warn("Notifications API: MongoDB not available, returning empty data.", error.message);
    const { searchParams } = new URL(req.url);
    if (searchParams.get("countOnly") === "true") {
      return NextResponse.json({ unread: 0 });
    }
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const newNotification = await Notification.create(body);
    return NextResponse.json(newNotification, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Mark all as read
export async function PATCH() {
  try {
    await connectDB();
    await Notification.updateMany({ read: false }, { $set: { read: true } });
    return NextResponse.json({ message: "All notifications marked as read" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
