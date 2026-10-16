export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Report } from "@/models/Report";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const report = await Report.findById(id);
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    return NextResponse.json(report, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const updatedReport = await Report.findByIdAndUpdate(
      id,
      {
        $set: {
          name: body.name,
          type: body.type,
          startDate: body.startDate ? new Date(body.startDate) : undefined,
          endDate: body.endDate ? new Date(body.endDate) : undefined,
          status: body.status || "Generated",
        },
      },
      { new: true }
    );

    if (!updatedReport) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json(updatedReport, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    
    const report = await Report.findByIdAndDelete(id);
    
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    
    return NextResponse.json({ message: "Report deleted successfully" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
