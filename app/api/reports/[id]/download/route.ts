export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Report } from "@/models/Report";
import { Contract } from "@/models/Contract";
import { Unit } from "@/models/Unit";
import { Client } from "@/models/Client";
import { Damage } from "@/models/Damage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const resolvedParams = await params;
    const report = await Report.findById(resolvedParams.id);

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    let csvContent = "";
    
    // Create date filter if timeline exists
    const dateQuery: any = {};
    if (report.startDate && report.endDate) {
      dateQuery.createdAt = {
        $gte: new Date(report.startDate),
        $lte: new Date(report.endDate)
      };
    }

    switch (report.type) {
      case "Financial & Revenue":
        const _c = Client; // ensure loaded
        const _u = Unit; // ensure loaded
        const contracts = await Contract.find(dateQuery)
          .populate("clientId")
          .populate("unitId")
          .lean();
        
        csvContent += "Contract ID,Customer Name,Vehicle Plate,Start Date,End Date,Status,Total Amount ($)\n";
        contracts.forEach((c: any) => {
          csvContent += `"${c._id}","${c.clientId?.name || 'Unknown'}","${c.unitId?.plate || 'Unknown'}","${new Date(c.startDate).toLocaleDateString()}","${new Date(c.endDate).toLocaleDateString()}","${c.status}","${c.totalAmount || 0}"\n`;
        });
        break;

      case "Vehicle Utilization":
        const units = await Unit.find({}).lean();
        csvContent += "Vehicle ID,Make,Model,Year,Plate,Status,Daily Rate ($),KM Limit\n";
        units.forEach((u: any) => {
          csvContent += `"${u._id}","${u.make}","${u.model}","${u.year}","${u.plate}","${u.status}","${u.dailyRate || 0}","${u.dailyKmLimit || 'Unlimited'}"\n`;
        });
        break;

      case "Customer Analytics":
        const clients = await Client.find(dateQuery).lean();
        csvContent += "Customer ID,Name,Phone,ID Number,Nationality\n";
        clients.forEach((c: any) => {
          csvContent += `"${c._id}","${c.name}","${c.phone}","${c.idNumber}","${c.nationality || ''}"\n`;
        });
        break;

      case "Damage & Maintenance":
        const damages = await Damage.find(dateQuery).populate("unitId").lean();
        csvContent += "Damage ID,Vehicle Plate,Description,Status,Cost ($),Reported Date\n";
        damages.forEach((d: any) => {
          csvContent += `"${d._id}","${d.unitId?.plate || 'Unknown'}","${d.description}","${d.status}","${d.cost || 0}","${new Date(d.createdAt).toLocaleDateString()}"\n`;
        });
        break;
        
      default:
        csvContent = "No data available for this report type.\n";
    }

    const headers = new Headers();
    headers.set("Content-Type", "text/csv");
    headers.set("Content-Disposition", `attachment; filename="${report.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv"`);

    return new NextResponse(csvContent, {
      status: 200,
      headers,
    });

  } catch (error: any) {
    console.error("Error downloading report:", error);
    return NextResponse.json(
      { error: error.message || "Failed to download report" },
      { status: 500 }
    );
  }
}
