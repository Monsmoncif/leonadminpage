import { NextResponse } from "next/server";
import { generateContractPdfFromPrintUrl } from "@/lib/pdf-generator";
import connectDB from "@/lib/db";
import { Contract } from "@/models/Contract";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing contract id" }, { status: 400 });
    }

    await connectDB();
    const contract = await Contract.findById(id).lean() as any;
    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    const contractNum = contract.contractNumber || contract._id.toString().substring(0, 8).toUpperCase();
    const pdfBuffer = await generateContractPdfFromPrintUrl(id);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Contract-${contractNum}.pdf"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error: any) {
    console.error("[ContractPdfRoute] Error rendering PDF:", error);
    return NextResponse.json({ error: error.message || "Failed to generate PDF" }, { status: 500 });
  }
}
