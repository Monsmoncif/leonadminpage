export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import { Contract } from "@/models/Contract";
import { Client } from "@/models/Client";
import { Unit } from "@/models/Unit";
import { Log } from "@/models/Log";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";
import nodemailer from "nodemailer";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { sendClientContractNotification, sendDriverTaskNotification } from "@/lib/contract-notifications";

const emptyResponse = {
  contracts: [],
  stats: {
    activeContracts: 0,
    pendingSignatures: 0,
    completedThisMonth: 0,
    cancelled: 0,
  }
};

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const driverId = searchParams.get("driverId");

    let filter: any = {};
    if (driverId) {
      const isValidObjectId = mongoose.Types.ObjectId.isValid(driverId);
      const objectId = isValidObjectId ? new mongoose.Types.ObjectId(driverId) : null;

      filter.$or = [
        { driverId: driverId },
        { deliveryDriverId: driverId },
        { returnDriverId: driverId },
        ...(objectId ? [
          { driverId: objectId },
          { deliveryDriverId: objectId },
          { returnDriverId: objectId }
        ] : [])
      ];
    }

    const contracts = await Contract.find(filter)
      .sort({ createdAt: -1 })
      .populate({ path: "clientId", select: "name phone", strictPopulate: false })
      .populate({ path: "unitId", select: "make model plate mileage images color year fuelType", strictPopulate: false })
      .populate({ path: "driverId", select: "name", strictPopulate: false })
      .populate({ path: "deliveryDriverId", select: "name", strictPopulate: false })
      .populate({ path: "returnDriverId", select: "name", strictPopulate: false })
      .lean();

    // Calculate stats
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      activeContracts: contracts.filter((c: any) => c.status === "Active").length,
      pendingSignatures: contracts.filter((c: any) => c.status === "Draft").length,
      completedThisMonth: contracts.filter((c: any) => c.status === "Completed" && new Date(c.updatedAt) >= startOfMonth).length,
      cancelled: contracts.filter((c: any) => c.status === "Cancelled").length,
    };

    const formattedContracts = contracts.map((c: any) => ({
      ...c,
      id: c.contractNumber ? String(c.contractNumber) : c._id.toString().substring(0, 8).toUpperCase(), // Short ID for display
      contractNumber: c.contractNumber,
      _id: c._id.toString(), // Real ID
      clientId: c.clientId?._id?.toString() || c.clientId || "",
      unitId: c.unitId?._id?.toString() || c.unitId || "",
      driverId: c.driverId?._id?.toString() || c.driverId || "",
      deliveryDriverId: c.deliveryDriverId?._id?.toString() || c.deliveryDriverId || "",
      returnDriverId: c.returnDriverId?._id?.toString() || c.returnDriverId || "",
      customer: c.clientId?.name || "Unknown",
      customerPhone: c.clientId?.phone || "",
      driver: c.deliveryDriverId?.name || c.driverId?.name || "None",
      deliveryDriver: c.deliveryDriverId?.name || (c.driverId && !c.returnDriverId ? c.driverId?.name : "None"),
      returnDriver: c.returnDriverId?.name || "None",
      vehicle: c.unitId ? `${c.unitId.make} ${c.unitId.model} (${c.unitId.plate})` : "Unknown Vehicle",
      vehiclePlate: c.unitId?.plate || "",
      vehicleColor: c.unitId?.color || "",
      vehicleYear: c.unitId?.year || "",
      vehicleFuel: c.unitId?.fuelType || "",
      vehicleImage: c.unitId?.images?.[0] || null,
      unitMileage: c.checkoutMileage !== undefined ? c.checkoutMileage : (c.unitId?.mileage || 0),
      depositAmount: Number(c.depositAmount) || 0,
      rawStartDate: c.startDate,
      rawEndDate: c.endDate,
      checkoutTime: c.checkoutTime || "08:00 AM",
      checkinTime: c.checkinTime || "08:00 AM",
      startDate: new Date(c.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      endDate: new Date(c.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      deposit: `$${c.depositAmount || 0}`,
      rentAmount: `$${c.totalAmount || 0}`,
      status: c.status,
      createdAt: c.createdAt,
      notes: c.notes || "",
      returnNotes: c.returnNotes || "",
      pickupLocation: c.pickupLocation || c.deliveryLocation || c.location || "Main Office",
      dropoffLocation: c.dropoffLocation || c.returnLocation || "",
      contractType: c.contractType || "Delivery",
      rentalType: c.rentalType || (c.totalDays >= 30 ? "Monthly" : "Daily"),
      customerType: c.customerType || "B2C",
      deliveryStatus: c.deliveryStatus || "Pending",
      paymentMethod: c.paymentMethod || "Cash",
      paymentStatus: c.paymentStatus || "Pending",
      customerSignature: c.customerSignature || "",
      adminSignature: c.adminSignature || "",
    }));

    return NextResponse.json({ contracts: formattedContracts, stats });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to load contracts data", message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    const userName = session?.user?.name || "System";
    const userRole = (session?.user as any)?.role || "admin";

    const body = await req.json();

    // Calculate total days
    const start = new Date(body.startDate);
    const end = new Date(body.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
    
    // Fallback daily rate if not provided in request
    const dailyRate = body.dailyRate || 50; 

    // Retrieve auxiliary fees
    const babySeatFees = Number(body.babySeatFees) || 0;
    const tintingFees = Number(body.tintingFees) || 0;
    const deliveryCharges = Number(body.deliveryCharges) || 0;
    const salikFees = Number(body.salikFees) || 0;
    const cleaningFees = Number(body.cleaningFees) || 0;

    const totalAmount = body.totalAmount || ((days * dailyRate) + babySeatFees + tintingFees + deliveryCharges + salikFees + cleaningFees);

    // Validate that the vehicle exists and is currently Available
    const unitDoc = await Unit.findById(body.unitId);
    if (!unitDoc) {
      return NextResponse.json({ error: "Selected vehicle not found." }, { status: 404 });
    }

    if (unitDoc.status?.toLowerCase() !== "available") {
      return NextResponse.json(
        { error: `Vehicle (${unitDoc.make} ${unitDoc.model} - ${unitDoc.plate}) is currently ${unitDoc.status} and cannot be booked.` },
        { status: 400 }
      );
    }

    // Check if vehicle is already assigned to an ongoing Active or Delivered contract
    const existingActiveContract = await Contract.findOne({
      unitId: body.unitId,
      status: { $in: ["Active", "Draft"] },
    });
    if (existingActiveContract) {
      return NextResponse.json(
        { error: `Vehicle (${unitDoc.make} ${unitDoc.model} - ${unitDoc.plate}) is currently out on contract #${existingActiveContract._id.toString().substring(0, 8).toUpperCase()} and cannot be booked.` },
        { status: 400 }
      );
    }

    const checkoutMileage = unitDoc.mileage || 0;

    const contractType = body.contractType || "Delivery";

    // For Delivery contracts, clientId is optional (driver will register the client)
    // For Shop contracts, clientId is required
    if (contractType === "Shop" && !body.clientId) {
      return NextResponse.json({ error: "Client is required for Shop contracts." }, { status: 400 });
    }

    const deliveryDriverId = body.deliveryDriverId || body.driverId || null;
    const returnDriverId = body.returnDriverId || null;
    const mainDriverId = deliveryDriverId || returnDriverId || null;

    // For Delivery contracts, a driver must be assigned
    if (contractType === "Delivery" && !deliveryDriverId) {
      return NextResponse.json({ error: "A delivery driver must be assigned for Delivery contracts." }, { status: 400 });
    }

    const lastContract = await Contract.findOne({ contractNumber: { $exists: true, $ne: null } })
      .sort({ contractNumber: -1 })
      .select("contractNumber")
      .lean();

    const nextContractNumber =
      lastContract && typeof (lastContract as any).contractNumber === "number" && (lastContract as any).contractNumber >= 2000
        ? (lastContract as any).contractNumber + 1
        : 2000;

    const contract = await Contract.create({
      contractNumber: nextContractNumber,
      clientId: body.clientId || null,
      unitId: body.unitId,
      contractType: contractType,
      rentalType: body.rentalType || (days >= 30 ? "Monthly" : "Daily"),
      customerType: body.customerType || "B2C",
      driverId: mainDriverId,
      deliveryDriverId: deliveryDriverId,
      returnDriverId: returnDriverId,
      checkoutMileage,
      checkoutFuelLevel: body.checkoutFuelLevel !== undefined ? Number(body.checkoutFuelLevel) : 100,
      startDate: body.startDate,
      endDate: body.endDate,
      dailyRate: body.dailyRate || dailyRate,
      dailyKmLimit: body.dailyKmLimit || 0,
      pricePerExtraKm: body.pricePerExtraKm || 0,
      totalDays: days,
      totalAmount: totalAmount,
      depositAmount: body.depositAmount || 0,
      pickupLocation: body.pickupLocation || body.deliveryLocation || body.location || "Main Office",
      dropoffLocation: body.dropoffLocation || body.returnLocation || "",
      status: contractType === "Shop" ? "Active" : (body.status || "Draft"),
      notes: body.notes || "",
      returnNotes: body.returnNotes || "",
      checkoutTime: body.checkoutTime || "08:00 AM",
      checkinTime: body.checkinTime || "08:00 AM",
      babySeatFees,
      tintingFees,
      deliveryCharges,
      salikFees,
      cleaningFees,
      customerSignature: body.customerSignature,
      adminSignature: body.adminSignature,
      inspectionPhotos: body.inspectionPhotos || [],
      // Shop contracts: car is already at the shop, mark as Delivered immediately
      deliveryStatus: contractType === "Shop" ? "Delivered" : (body.deliveryStatus || "Pending"),
      paymentMethod: body.paymentMethod || "Cash",
      paymentStatus: body.paymentStatus || "Pending",
      additionalDriverName: body.additionalDriverName || "",
      additionalDriverLicense: body.additionalDriverLicense || "",
      additionalDriverNationality: body.additionalDriverNationality || "",
      additionalDriverPhone: body.additionalDriverPhone || "",
      additionalDriverExpiry: body.additionalDriverExpiry || "",
      additionalDriverIssuedAt: body.additionalDriverIssuedAt || "",
    });

    // Automatically create a Notification for the new contract
    try {
      await Notification.create({
        title: "New Contract Created",
        message: `Contract #${contract.contractNumber || contract._id.toString().substring(0,8).toUpperCase()} was created.`,
        type: "contract"
      });
    } catch (e) { console.error("Failed to create notification", e); }

    // Automatically create a Log for the new contract
    try {
      const count = await Log.countDocuments();
      await Log.create({
        logId: `LOG-${(count + 1).toString().padStart(3, '0')}`,
        user: userName,
        role: userRole,
        action: "Contract Created",
        description: `Contract #${contract.contractNumber || contract._id.toString().substring(0,8).toUpperCase()} generated.`,
        type: "create",
        ip: "127.0.0.1"
      });
    } catch (e) { console.error("Failed to create log", e); }

    // Reserve unit status to Rented upon contract creation
    await Unit.findByIdAndUpdate(body.unitId, { status: "Rented" });

    // 1. Send contract PDF/details to client in background ONLY if getting the car right now (Shop contract)
    // Non-blocking so contract creation responds immediately (<200ms) to user and redirects
    if (contractType === "Shop" && contract.clientId) {
      sendClientContractNotification(contract._id.toString(), "initial").catch((clientErr) => {
        console.error("Failed to notify client on shop contract handover (background):", clientErr);
      });
    }

    // 2. Notify driver via WhatsApp + Gmail if assigned (background non-blocking)
    const assignedDriverId = deliveryDriverId || body.driverId;
    if (assignedDriverId) {
      sendDriverTaskNotification(assignedDriverId, contract._id.toString(), "delivery_assigned").catch((driverErr) => {
        console.error("Failed to notify driver on contract creation (background):", driverErr);
      });
    }


    return NextResponse.json(contract, { status: 201 });
  } catch (error: any) {
    console.error("Error creating contract:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create contract" },
      { status: 500 }
    );
  }
}

