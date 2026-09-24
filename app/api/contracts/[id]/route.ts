export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import { Contract } from "@/models/Contract";
import { Client } from "@/models/Client";
import { Unit } from "@/models/Unit";
import { User } from "@/models/User";
import { Damage } from "@/models/Damage";
import { Log } from "@/models/Log";
import { Notification } from "@/models/Notification";
import { Inspection } from "@/models/Inspection";
import nodemailer from "nodemailer";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { sendClientContractNotification, sendDriverTaskNotification } from "@/lib/contract-notifications";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const resolvedParams = await params;

    // Ensure models are registered for populating
    const _c = Client;
    const _u = Unit;
    const _d = User;

    let contract: any = null;
    if (mongoose.Types.ObjectId.isValid(resolvedParams.id)) {
      contract = await Contract.findById(resolvedParams.id)
        .populate({ path: "clientId", strictPopulate: false })
        .populate({ path: "unitId", strictPopulate: false })
        .populate({ path: "driverId", strictPopulate: false })
        .populate({ path: "deliveryDriverId", strictPopulate: false })
        .populate({ path: "returnDriverId", strictPopulate: false })
        .lean();
    }
    if (!contract && !isNaN(Number(resolvedParams.id))) {
      contract = await Contract.findOne({ contractNumber: Number(resolvedParams.id) })
        .populate({ path: "clientId", strictPopulate: false })
        .populate({ path: "unitId", strictPopulate: false })
        .populate({ path: "driverId", strictPopulate: false })
        .populate({ path: "deliveryDriverId", strictPopulate: false })
        .populate({ path: "returnDriverId", strictPopulate: false })
        .lean();
    }

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(contract, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching contract:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch contract" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    const userName = session?.user?.name || "System";
    const userRole = (session?.user as any)?.role || "admin";

    const resolvedParams = await params;
    const body = await request.json();

    const existingContract = await Contract.findById(resolvedParams.id);
    if (!existingContract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    // Recalculate duration & amount if dates or rates are updated
    const startDateVal = body.startDate ? new Date(body.startDate) : new Date(existingContract.startDate);
    const endDateVal = body.endDate ? new Date(body.endDate) : new Date(existingContract.endDate);
    const dailyRateVal = body.dailyRate !== undefined ? Number(body.dailyRate) : existingContract.dailyRate;

    const babySeatFees = body.babySeatFees !== undefined ? Number(body.babySeatFees) : (existingContract.babySeatFees || 0);
    const tintingFees = body.tintingFees !== undefined ? Number(body.tintingFees) : (existingContract.tintingFees || 0);
    const deliveryCharges = body.deliveryCharges !== undefined ? Number(body.deliveryCharges) : (existingContract.deliveryCharges || 0);
    const salikFees = body.salikFees !== undefined ? Number(body.salikFees) : (body.salikCharge !== undefined ? Number(body.salikCharge) : (existingContract.salikFees || existingContract.salikCharge || 0));
    const parkingFees = body.parkingFees !== undefined ? Number(body.parkingFees) : (body.parkingCharge !== undefined ? Number(body.parkingCharge) : (existingContract.parkingFees || existingContract.parkingCharge || 0));
    const finesFees = body.finesFees !== undefined ? Number(body.finesFees) : (body.finesCharge !== undefined ? Number(body.finesCharge) : (existingContract.finesFees || existingContract.finesCharge || 0));
    const fuelFees = body.fuelFees !== undefined ? Number(body.fuelFees) : (body.fuelCharge !== undefined ? Number(body.fuelCharge) : (existingContract.fuelFees || existingContract.fuelCharge || 0));
    const cleaningFees = body.cleaningFees !== undefined ? Number(body.cleaningFees) : (existingContract.cleaningFees || 0);

    const diffTime = Math.abs(endDateVal.getTime() - startDateVal.getTime());
    const totalDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    
    const extraKmCharge = body.extraKmCharge !== undefined ? Number(body.extraKmCharge) : (existingContract.extraKmCharge || 0);
    const damageCharge = body.damageCharge !== undefined ? Number(body.damageCharge) : (existingContract.damageCharge || 0);

    const totalAmount = (totalDays * dailyRateVal) + babySeatFees + tintingFees + deliveryCharges + salikFees + parkingFees + finesFees + fuelFees + cleaningFees + extraKmCharge + damageCharge;

    const updatedData: any = {
      ...body,
      totalDays,
      totalAmount,
      salikFees,
      parkingFees,
      finesFees,
      fuelFees,
      salikCharge: salikFees,
      parkingCharge: parkingFees,
      finesCharge: finesFees,
      fuelCharge: fuelFees,
    };

    // If changing the assigned vehicle, ensure the target vehicle is available
    if (body.unitId && body.unitId.toString() !== existingContract.unitId?.toString()) {
      const newUnitDoc = await Unit.findById(body.unitId);
      if (!newUnitDoc) {
        return NextResponse.json({ error: "Selected replacement vehicle not found." }, { status: 404 });
      }
      if (newUnitDoc.status?.toLowerCase() !== "available") {
        return NextResponse.json(
          { error: `Vehicle (${newUnitDoc.make} ${newUnitDoc.model} - ${newUnitDoc.plate}) is currently ${newUnitDoc.status} and cannot be assigned.` },
          { status: 400 }
        );
      }
      const conflictingContract = await Contract.findOne({
        _id: { $ne: resolvedParams.id },
        unitId: body.unitId,
        status: { $in: ["Active", "Draft"] }
      });
      if (conflictingContract) {
        return NextResponse.json(
          { error: `Vehicle (${newUnitDoc.make} ${newUnitDoc.model} - ${newUnitDoc.plate}) is already assigned to active contract #${conflictingContract._id.toString().substring(0, 8).toUpperCase()}.` },
          { status: 400 }
        );
      }
      // Revert status of previous unit to Available and reserve new unit as Rented
      if (existingContract.unitId) {
        await Unit.findByIdAndUpdate(existingContract.unitId, { status: "Available" });
      }
      await Unit.findByIdAndUpdate(body.unitId, { status: "Rented" });
    }

    if (body.driverId !== undefined) {
      updatedData.driverId = (body.driverId && mongoose.Types.ObjectId.isValid(body.driverId)) ? body.driverId : null;
    }
    if (body.deliveryDriverId !== undefined) {
      updatedData.deliveryDriverId = (body.deliveryDriverId && mongoose.Types.ObjectId.isValid(body.deliveryDriverId)) ? body.deliveryDriverId : null;
    }
    if (body.returnDriverId !== undefined) {
      updatedData.returnDriverId = (body.returnDriverId && mongoose.Types.ObjectId.isValid(body.returnDriverId)) ? body.returnDriverId : null;
    }
    if (body.returnDriver !== undefined) {
      updatedData.returnDriver = body.returnDriver;
    }

    // Sanitize deliveryStatus: only allow valid enum values; strip out non-enums like "Return Scheduled"
    if (updatedData.deliveryStatus && !["Pending", "Delivered", "Returned"].includes(updatedData.deliveryStatus)) {
      delete updatedData.deliveryStatus;
    }

    // Auto-sync deliveryStatus when completed
    if (body.status === "Completed") {
      updatedData.deliveryStatus = "Returned";
    }

    // When driver marks as Delivered, activate contract if it was Draft and ensure car is Rented
    if (body.deliveryStatus === "Delivered" && existingContract.deliveryStatus !== "Delivered") {
      if (existingContract.status === "Draft") {
        updatedData.status = "Active";
      }
      await Unit.findByIdAndUpdate(existingContract.unitId, { status: "Rented" });

      try {
        const count = await Log.countDocuments();
        await Log.create({
          logId: `LOG-${(count + 1).toString().padStart(3, '0')}`,
          user: userName,
          role: userRole,
          action: "Vehicle Delivered",
          description: `Contract ${existingContract._id.toString().substring(0,8).toUpperCase()} vehicle delivered to client at ${existingContract.pickupLocation || "location"}.`,
          type: "edit",
          ip: "127.0.0.1"
        });

        await Notification.create({
          title: "Vehicle Delivered",
          message: `Vehicle for contract ${existingContract._id.toString().substring(0,8).toUpperCase()} delivered to client at ${existingContract.pickupLocation || "location"}.`,
          type: "contract"
        });
      } catch (logErr) {
        console.error("Failed to log delivery:", logErr);
      }

      // Auto-notify admin that vehicle was delivered
      try {
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        fetch(`${baseUrl}/api/contracts/notify-admin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contractId: existingContract._id.toString(), type: "vehicle_delivered" }),
        }).catch(err => console.error("Failed to notify admin on delivery:", err));
      } catch (e) { console.error("Admin notify trigger failed:", e); }
    }

    const updatedContract = await Contract.findByIdAndUpdate(
      resolvedParams.id,
      updatedData,
      { new: true, runValidators: true }
    );

    if (!updatedContract) {
      return NextResponse.json(
        { error: "Failed to update contract" },
        { status: 500 }
      );
    }

    // Auto-send initial contract PDF to client once vehicle handover is confirmed (Delivered)
    if (body.deliveryStatus === "Delivered" && existingContract.deliveryStatus !== "Delivered") {
      sendClientContractNotification(resolvedParams.id, "initial").catch(e => console.error("Client contract send trigger failed (background):", e));
    }

    // Send notifications to driver if newly assigned (delivery or return) in background
    // Delivery driver assigned
    if (body.deliveryDriverId && body.deliveryDriverId !== existingContract.deliveryDriverId?.toString()) {
      sendDriverTaskNotification(body.deliveryDriverId, resolvedParams.id, "delivery_assigned").catch(e => console.error("Delivery driver notify failed (background):", e));
    }

    // Return driver assigned
    if (body.returnDriverId && body.returnDriverId !== existingContract.returnDriverId?.toString()) {
      sendDriverTaskNotification(body.returnDriverId, resolvedParams.id, "return_assigned").catch(e => console.error("Return driver notify failed (background):", e));
    }

    // Legacy: driverId assigned (fallback for old-style assignment)
    if (body.driverId && body.driverId !== existingContract.driverId?.toString() && !body.deliveryDriverId && !body.returnDriverId) {
      sendDriverTaskNotification(body.driverId, resolvedParams.id, "delivery_assigned").catch(e => console.error("Driver notify failed (background):", e));
    }


    // Fetch unit's initial mileage before we possibly update it upon completion
    const unitBeforeUpdate = await Unit.findById(existingContract.unitId);
    const initialMileage = existingContract.checkoutMileage || unitBeforeUpdate?.mileage || 0;

    // Sync unit status and mileage based on contract status
    if (body.status && body.status !== existingContract.status) {
      if (body.status === "Completed" || body.status === "Cancelled") {
        let nextUnitStatus = "Available";
        
        // Check for pending damages
        const hasPendingDamage = await Damage.findOne({ unitId: existingContract.unitId, status: "Pending" });
        if (hasPendingDamage || (body.newDamages && body.newDamages !== "None" && body.newDamages !== "")) {
          nextUnitStatus = "Maintenance";
        }

        const updateData: any = { status: nextUnitStatus };
        if (body.status === "Completed" && body.returnOdometer !== undefined) {
          updateData.mileage = Number(body.returnOdometer);
        }
        
        // تحديث صور المركبة بصور الإرجاع المرفوعة من السائق
        if (
          body.status === "Completed" &&
          Array.isArray(body.returnPhotos) &&
          body.returnPhotos.length > 0
        ) {
          // نضيف صور الإرجاع فقط (الصور الجديدة الحقيقية بعد الرجوع)
          // نستبدل صور المركبة القديمة بصور الإرجاع الجديدة
          updateData.images = body.returnPhotos.filter((url: string) => typeof url === "string" && url.trim() !== "");
        }

        await Unit.findByIdAndUpdate(existingContract.unitId, updateData);
      } else if (body.status === "Active") {
        await Unit.findByIdAndUpdate(existingContract.unitId, { status: "Rented" });
      }
    }

    try {
      const count = await Log.countDocuments();
      const moneyCollectedInfo = body.returnAmountCollected !== undefined
        ? ` Rest of money collected: $${body.returnAmountCollected} (${body.returnPaymentMethod || "Cash"}).`
        : "";

      await Log.create({
        logId: `LOG-${(count + 1).toString().padStart(3, '0')}`,
        user: userName, 
        role: userRole,
        action: body.status === "Completed" ? "Vehicle Returned & Settled" : "Contract Updated",
        description: `Contract ${updatedContract._id.toString().substring(0,8).toUpperCase()} was ${body.status === "Completed" ? "completed/returned" : "updated"}.${moneyCollectedInfo}`,
        type: "edit",
        ip: "127.0.0.1"
      });

      if (body.status === "Completed" && body.status !== existingContract.status) {
        await Notification.create({
          title: "Vehicle Returned & Settled",
          message: `Contract ${updatedContract._id.toString().substring(0,8).toUpperCase()} was returned. Driver confirmed collecting ${body.returnAmountCollected !== undefined ? `$${body.returnAmountCollected}` : "remaining balance"} to admin.`,
          type: "alert"
        });

        // Auto-notify admin that vehicle was returned
        try {
          const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
          fetch(`${baseUrl}/api/contracts/notify-admin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contractId: existingContract._id.toString(), type: "vehicle_returned" }),
          }).catch(err => console.error("Failed to notify admin on return:", err));
        } catch (e) { console.error("Admin return notify failed:", e); }

        // Note: On vehicle return, contract is kept for internal admin records only and NOT sent to client


        // Automatically generate Before and After inspections for Comparison
        try {
          const returnOdo = Number(body.returnOdometer) || initialMileage;
          
          const inspCount = await Inspection.countDocuments();
          
          // Check if Before Rental inspection already exists for this contract
          const existingBefore = await Inspection.findOne({ contractId: existingContract._id, type: "Before Rental" });
          if (!existingBefore) {
            await Inspection.create({
              inspectionId: `INSP-${(inspCount + 1).toString().padStart(4, '0')}`,
              type: "Before Rental",
              contractId: existingContract._id,
              unitId: existingContract.unitId,
              driverId: existingContract.driverId,
              date: existingContract.startDate,
              time: existingContract.checkoutTime || "08:00 AM",
              mileage: initialMileage,
              fuelLevel: Number(existingContract.checkoutFuelLevel || 100),
              damages: "None",
              photos: updatedContract.inspectionPhotos || [],
              status: "Completed"
            });
          }

          // Check if After Rental already exists
          const existingAfter = await Inspection.findOne({ contractId: existingContract._id, type: "After Rental" });
          if (!existingAfter) {
            await Inspection.create({
              inspectionId: `INSP-${(inspCount + (existingBefore ? 1 : 2)).toString().padStart(4, '0')}`,
              type: "After Rental",
              contractId: existingContract._id,
              unitId: existingContract.unitId,
              driverId: existingContract.driverId,
              date: new Date(),
              time: body.checkinTime || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              mileage: returnOdo,
              fuelLevel: Number(body.returnFuelLevel !== undefined ? body.returnFuelLevel : (existingContract.returnFuelLevel || 100)),
              damages: body.newDamages || "None",
              photos: updatedContract.returnPhotos || [],
              status: "Completed"
            });
          }

          // Check if damages reported, auto-create a Damage entry for Admin review/pricing
          if (body.newDamages && body.newDamages !== "None") {
            try {
              const existingDamage = await Damage.findOne({ contractId: existingContract._id });
              if (!existingDamage) {
                const damageCount = await Damage.countDocuments();
                const damagePhotosList = Array.isArray(body.damagePhotos) && body.damagePhotos.length > 0
                  ? body.damagePhotos
                  : [];
                await Damage.create({
                  damageId: `DMG-${(damageCount + 1).toString().padStart(4, '0')}`,
                  unitId: existingContract.unitId,
                  contractId: existingContract._id,
                  description: body.newDamages,
                  cost: 0, // Admin sets the cost
                  status: "Pending",
                  photos: damagePhotosList,
                  reportedByRole: userRole || "driver",
                  reportedByName: userName || "Driver",
                  reportedDate: new Date(),
                });

                await Notification.create({
                  title: "New Damage Reported",
                  message: `Driver recorded new damages for contract ${existingContract._id.toString().substring(0,8).toUpperCase()}: "${body.newDamages}". Admin evaluation needed.`,
                  type: "alert"
                });
              }
            } catch (dmgErr) {
              console.error("Failed to auto-create damage record:", dmgErr);
            }
          }
        } catch (inspErr) {
          console.error("Failed to generate inspections", inspErr);
        }
      }
    } catch (e) { console.error("Failed to log contract update", e); }

    return NextResponse.json(updatedContract, { status: 200 });
  } catch (error: any) {
    console.error("Error updating contract:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update contract" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    const userName = session?.user?.name || "System";
    const userRole = (session?.user as any)?.role || "admin";

    const resolvedParams = await params;
    const deletedContract = await Contract.findByIdAndDelete(resolvedParams.id);

    if (!deletedContract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    // Delete associated damages and inspections
    await Damage.deleteMany({ contractId: resolvedParams.id });
    await Inspection.deleteMany({ contractId: resolvedParams.id });

    // If no other active or draft contracts exist for this vehicle, restore to Available
    if (deletedContract.unitId) {
      const otherContract = await Contract.findOne({
        unitId: deletedContract.unitId,
        _id: { $ne: deletedContract._id },
        status: { $in: ["Active", "Draft"] },
      });

      if (!otherContract) {
        const hasPendingDamage = await Damage.findOne({
          unitId: deletedContract.unitId,
          status: "Pending",
        });
        await Unit.findByIdAndUpdate(deletedContract.unitId, {
          status: hasPendingDamage ? "Maintenance" : "Available",
        });
      }
    }

    return NextResponse.json(
      { message: "Contract deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting contract:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete contract" },
      { status: 500 }
    );
  }
}

// PATCH: Link a client to a Delivery contract (used by driver after registering client)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const resolvedParams = await params;
    const body = await request.json();

    const contract = await Contract.findById(resolvedParams.id);
    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Only allow linking client if none is set yet
    if (body.clientId) {
      const clientDoc = await Client.findById(body.clientId);
      if (!clientDoc) {
        return NextResponse.json({ error: "Client not found" }, { status: 404 });
      }
      contract.clientId = body.clientId;
    }

    await contract.save();

    try {
      const session = await getServerSession(authOptions);
      const userName = session?.user?.name || "Driver";
      const count = await Log.countDocuments();
      await Log.create({
        logId: `LOG-${(count + 1).toString().padStart(3, '0')}`,
        user: userName,
        role: "driver",
        action: "Client Linked to Contract",
        description: `Client was registered and linked to Delivery contract ${contract._id.toString().substring(0,8).toUpperCase()} by driver.`,
        type: "edit",
        ip: "127.0.0.1"
      });
      await Notification.create({
        title: "Client Registered by Driver",
        message: `Driver registered a new client and linked them to contract ${contract._id.toString().substring(0,8).toUpperCase()}.`,
        type: "contract"
      });
    } catch (e) { console.error("Failed to log client link:", e); }

    return NextResponse.json(contract, { status: 200 });
  } catch (error: any) {
    console.error("Error patching contract:", error);
    return NextResponse.json(
      { error: error.message || "Failed to patch contract" },
      { status: 500 }
    );
  }
}
