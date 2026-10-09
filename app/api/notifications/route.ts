import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Notification } from "@/models/Notification";
import { Contract } from "@/models/Contract";
import "@/models/Unit";
import "@/models/Client";
import { sendHandoverReminderNotification } from "@/lib/contract-notifications";

export const dynamic = "force-dynamic";

async function checkUpcomingHandoverReminders() {
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

      // Check if reminder notification already exists for this contract and timing
      const existing = await Notification.findOne({
        type: "reminder",
        $or: [
          { title: { $regex: `${contractNum}.*${timingLabel}`, $options: "i" } },
          { message: { $regex: `${contractNum}.*${timingLabel}`, $options: "i" } },
        ],
      });

      if (!existing) {
        const vehicle = (contract.unitId as any)?.make 
          ? `${(contract.unitId as any).make} ${(contract.unitId as any).model || ""} (${(contract.unitId as any).plate || ""})`.trim()
          : "Vehicle";
        const client = (contract.clientId as any)?.name || (contract as any).additionalDriverName || "Client";
        const dateFormatted = contractStartDate.toLocaleDateString("en-US", {
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

export async function GET() {
  try {
    await connectDB();
    await checkUpcomingHandoverReminders();
    const notifications = await Notification.find({}).sort({ createdAt: -1 });
    return NextResponse.json(notifications);
  } catch (error: any) {
    console.warn("Notifications API: MongoDB not available, returning empty data.", error.message);
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
