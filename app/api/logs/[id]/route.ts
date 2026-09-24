import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Log } from "@/models/Log";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const resolvedParams = await params;
    const deletedLog = await Log.findByIdAndDelete(resolvedParams.id);
    
    if (!deletedLog) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }
    
    return NextResponse.json({ message: "Log deleted successfully" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
