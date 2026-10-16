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

    // UTF-8 BOM for Excel Arabic / international character compatibility
    let csvContent = "\uFEFF";
    
    // Create date filter if timeline exists
    const dateQuery: any = {};
    if (report.startDate && report.endDate) {
      dateQuery.createdAt = {
        $gte: new Date(report.startDate),
        $lte: new Date(new Date(report.endDate).setHours(23, 59, 59, 999))
      };
    }

    switch (report.type) {
      case "Financial & Revenue": {
        const _c = Client; // ensure loaded
        const _u = Unit; // ensure loaded
        const contracts = await Contract.find(dateQuery)
          .populate("clientId")
          .populate("unitId")
          .sort({ createdAt: -1 })
          .lean();
        
        csvContent += "Contract #,Type,Customer Name,Customer Phone,Vehicle,Plate,Start Date,End Date,Days,Daily Rate (AED),Advance Paid (AED),Deposit (AED),Total Amount (AED),Payment Method,Payment Status,Delivery Status,Status,Created At\n";
        contracts.forEach((c: any) => {
          const contractNum = c.contractNumber || c._id?.toString().slice(-6).toUpperCase();
          const customerName = c.contractType === "Personalized" && c.personalizedPersonName ? c.personalizedPersonName : (c.clientId?.name || "Unknown Client");
          const customerPhone = c.clientId?.phone || "";
          const vehicleName = c.unitId ? `${c.unitId.make || ""} ${c.unitId.model || ""}`.trim() : "Unknown";
          const plate = c.unitId?.plate || "N/A";
          const startDate = c.startDate ? new Date(c.startDate).toLocaleDateString("en-CA") : "";
          const endDate = c.endDate ? new Date(c.endDate).toLocaleDateString("en-CA") : "";
          const createdAt = c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-CA") : "";

          csvContent += `"${contractNum}","${c.contractType || 'Standard'}","${customerName.replace(/"/g, '""')}","${customerPhone}","${vehicleName.replace(/"/g, '""')}","${plate}","${startDate}","${endDate}","${c.totalDays || 0}","${c.dailyRate || 0}","${c.advancePayment || 0}","${c.depositAmount || 0}","${c.totalAmount || 0}","${c.paymentMethod || 'Cash'}","${c.paymentStatus || 'Pending'}","${c.deliveryStatus || 'Pending'}","${c.status || 'Active'}","${createdAt}"\n`;
        });
        break;
      }

      case "Vehicle Utilization": {
        const units = await Unit.find({}).sort({ make: 1, model: 1 }).lean();
        csvContent += "Vehicle,Plate,Year,Color,Transmission,Fuel Type,Mileage (KM),Daily Rate (AED),Daily KM Limit,Status,Created At\n";
        units.forEach((u: any) => {
          const vehicleName = `${u.make || ""} ${u.model || ""}`.trim();
          const createdAt = u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-CA") : "";
          csvContent += `"${vehicleName.replace(/"/g, '""')}","${u.plate || ''}","${u.year || ''}","${u.color || ''}","${u.transmission || 'Automatic'}","${u.fuelType || 'Petrol'}","${u.mileage || 0}","${u.dailyRate || 0}","${u.dailyKmLimit || 'Unlimited'}","${u.status || 'Available'}","${createdAt}"\n`;
        });
        break;
      }

      case "Customer Analytics": {
        const clients = await Client.find(dateQuery).sort({ createdAt: -1 }).lean();
        csvContent += "Customer ID,Name,Phone,Email,Nationality,ID / Passport,License Number,Client Type,Status,Created At\n";
        clients.forEach((c: any) => {
          const idNum = c.idNumber || c.passportNumber || "";
          const createdAt = c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-CA") : "";
          csvContent += `"${c._id?.toString().slice(-6).toUpperCase()}","${(c.name || '').replace(/"/g, '""')}","${c.phone || ''}","${c.email || ''}","${c.nationality || ''}","${idNum}","${c.licenseNumber || ''}","${c.clientType || 'Resident'}","${c.status || 'Active'}","${createdAt}"\n`;
        });
        break;
      }

      case "Damage & Maintenance": {
        const damages = await Damage.find(dateQuery).populate("unitId").sort({ createdAt: -1 }).lean();
        csvContent += "Damage ID,Vehicle,Plate,Description,Severity,Status,Cost (AED),Reported Date\n";
        damages.forEach((d: any) => {
          const vehicle = d.unitId ? `${d.unitId.make || ""} ${d.unitId.model || ""}`.trim() : "Unknown";
          const plate = d.unitId?.plate || "N/A";
          const repDate = d.createdAt ? new Date(d.createdAt).toLocaleDateString("en-CA") : "";
          csvContent += `"${d._id?.toString().slice(-6).toUpperCase()}","${vehicle.replace(/"/g, '""')}","${plate}","${(d.description || '').replace(/"/g, '""')}","${d.severity || 'Medium'}","${d.status || 'Pending'}","${d.cost || 0}","${repDate}"\n`;
        });
        break;
      }
        
      default:
        csvContent += "No data available for this report type.\n";
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
