import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Notification } from "@/models/Notification";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
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
