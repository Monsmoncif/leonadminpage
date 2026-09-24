import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Report } from "@/models/Report";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    const reports = await Report.find({}).sort({ dateGenerated: -1 });
    return NextResponse.json(reports, { status: 200 });
  } catch (error: any) {
    console.warn("Reports API: MongoDB not available, returning empty data.", error.message);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    const newReport = await Report.create({
      ...body,
      status: "Generated", // Instantly ready for download
    });

    return NextResponse.json(newReport, { status: 201 });
  } catch (error: any) {
    console.error("Error creating report:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create report" },
      { status: 500 }
    );
  }
}
