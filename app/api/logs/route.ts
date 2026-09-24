import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Log } from "@/models/Log";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    const logs = await Log.find({}).sort({ createdAt: -1 }).limit(100);
    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    
    // Auto-generate logId
    const count = await Log.countDocuments();
    body.logId = `LOG-${(count + 1).toString().padStart(3, '0')}`;
    
    const newLog = await Log.create(body);
    return NextResponse.json(newLog, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await connectDB();
    await Log.deleteMany({});
    return NextResponse.json({ message: "All logs cleared successfully" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
