export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import { Contract } from "@/models/Contract";
import { Client } from "@/models/Client";
import { Unit } from "@/models/Unit";
import { User } from "@/models/User";
import { Log } from "@/models/Log";
import { Notification } from "@/models/Notification";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { sendDriverTaskNotification } from "@/lib/contract-notifications";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    const userName = session?.user?.name || "Admin";
    const userRole = (session?.user as any)?.role || "admin";

    const resolvedParams = await params;
    const contractId = resolvedParams.id;

    // Ensure models are registered
    const _c = Client;
    const _u = Unit;
    const _d = User;

    let contract: any = null;
    if (mongoose.Types.ObjectId.isValid(contractId)) {
      contract = await Contract.findById(contractId)
        .populate({ path: "clientId", strictPopulate: false })
        .populate({ path: "unitId", strictPopulate: false })
        .populate({ path: "deliveryDriverId", strictPopulate: false })
        .populate({ path: "driverId", strictPopulate: false });
    }
    if (!contract && !isNaN(Number(contractId))) {
      contract = await Contract.findOne({ contractNumber: Number(contractId) })
        .populate({ path: "clientId", strictPopulate: false })
        .populate({ path: "unitId", strictPopulate: false })
        .populate({ path: "deliveryDriverId", strictPopulate: false })
        .populate({ path: "driverId", strictPopulate: false });
    }

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    const assignedDriverId = contract.deliveryDriverId?._id?.toString() || 
                             contract.deliveryDriverId?.toString() || 
                             contract.driverId?._id?.toString() || 
                             contract.driverId?.toString();

    if (!assignedDriverId) {
      return NextResponse.json(
        { error: "A delivery driver must be assigned before dispatching this contract." },
        { status: 400 }
      );
    }

    // 1. Mark as dispatched (Contract number is NOT assigned here; it will only be assigned upon Handover confirmation)
    contract.isDispatched = true;
    contract.dispatchedAt = new Date();
    await contract.save();

    const contractNum = contract.contractNumber || contract._id.toString().substring(0, 8).toUpperCase();
    const driverName = contract.deliveryDriverId?.name || contract.driverId?.name || "Driver";

    // 3. Create Log & Admin Notification
    try {
      const count = await Log.countDocuments();
      await Log.create({
        logId: `LOG-${(count + 1).toString().padStart(3, "0")}`,
        user: userName,
        role: userRole,
        action: "Contract Dispatched",
        description: `Contract #${contractNum} confirmed and dispatched to driver ${driverName}.`,
        type: "edit",
        ip: "127.0.0.1",
      });

      await Notification.create({
        title: "Contract Dispatched",
        message: `Contract #${contractNum} was dispatched to ${driverName}.`,
        type: "contract",
      });
    } catch (e) {
      console.error("Failed to create log/notification for dispatch:", e);
    }

    // 4. Notify Driver via WhatsApp + Gmail in background
    sendDriverTaskNotification(assignedDriverId, contract._id.toString(), "delivery_assigned").catch((err) => {
      console.error("Failed to notify driver on contract dispatch:", err);
    });

    // Note: PDF is NOT generated during dispatch. It will only be generated when Hand Over is completed.

    return NextResponse.json({
      success: true,
      message: `Contract #${contractNum} dispatched successfully to ${driverName}`,
      contract,
    });
  } catch (error: any) {
    console.error("Error dispatching contract:", error);
    return NextResponse.json(
      { error: error.message || "Failed to dispatch contract" },
      { status: 500 }
    );
  }
}
