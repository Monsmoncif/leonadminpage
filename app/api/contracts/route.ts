export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import { Contract } from "@/models/Contract";
import { Client } from "@/models/Client";
import { Driver } from "@/models/Driver";
import { Unit } from "@/models/Unit";
import { Log } from "@/models/Log";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";
import nodemailer from "nodemailer";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { sendClientContractNotification, sendDriverTaskNotification, sendHandoverReminderNotification } from "@/lib/contract-notifications";
import { syncUnitStatuses, checkContractDateOverlap } from "@/lib/unit-status";
import { mergeHandoverAndReturnImages, hasAnyValidPhotos } from "@/lib/unit-images";
import {
  formatDateWords,
  formatDateToInput,
  addDaysToISODate,
  getBusinessTodayISO,
  calculateRentalDays,
  parseContractDateToUTCMidnight,
  getBusinessStartOfMonthUTC,
  BUSINESS_TIMEZONE,
} from "@/lib/date-utils";

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
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.trim();
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : null;
    const limit = limitParam ? Math.max(1, parseInt(limitParam, 10)) : null;

    let baseFilter: any = {};
    if (driverId) {
      const isValidObjectId = mongoose.Types.ObjectId.isValid(driverId);
      const objectId = isValidObjectId ? new mongoose.Types.ObjectId(driverId) : null;

      baseFilter.$or = [
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

    let filter: any = { ...baseFilter };

    if (status && status !== "All") {
      filter.status = status;
    }

    if (search) {
      const escaped = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      const searchRegex = new RegExp(escaped, "i");

      // Find matching clients, units, and drivers in parallel
      const [matchingClients, matchingUnits, matchingUsers] = await Promise.all([
        Client.find({
          $or: [
            { name: searchRegex },
            { phone: searchRegex },
            { email: searchRegex },
            { idNumber: searchRegex },
            { passportNumber: searchRegex },
            { licenseNumber: searchRegex },
          ]
        }).select("_id").lean(),
        Unit.find({
          $or: [
            { plate: searchRegex },
            { make: searchRegex },
            { model: searchRegex }
          ]
        }).select("_id").lean(),
        User.find({
          name: searchRegex
        }).select("_id").lean()
      ]);

      const clientIds = matchingClients.map((c: any) => c._id);
      const unitIds = matchingUnits.map((u: any) => u._id);
      const userIds = matchingUsers.map((u: any) => u._id);

      const orConditions: any[] = [
        { personalizedPersonName: searchRegex },
        { additionalDriverName: searchRegex },
        { notes: searchRegex },
      ];

      const numSearch = Number(search);
      if (!isNaN(numSearch)) {
        orConditions.push({ contractNumber: numSearch });
      }

      if (clientIds.length > 0) {
        orConditions.push({ clientId: { $in: clientIds } });
      }

      if (unitIds.length > 0) {
        orConditions.push({ unitId: { $in: unitIds } });
      }

      if (userIds.length > 0) {
        orConditions.push(
          { driverId: { $in: userIds } },
          { deliveryDriverId: { $in: userIds } },
          { returnDriverId: { $in: userIds } }
        );
      }

      if (filter.$or) {
        filter = {
          $and: [
            { $or: filter.$or },
            { $or: orConditions }
          ]
        };
      } else {
        filter.$or = orConditions;
      }
    }

    const isFull = searchParams.get("full") === "true";
    const isLite = searchParams.get("lite") === "true";
    const skipStats = searchParams.get("skipStats") === "true";

    const startOfMonth = getBusinessStartOfMonthUTC();
    const statsFilter = driverId ? baseFilter : {};

    let contractsQuery = Contract.find(filter).sort({ createdAt: -1 });
    if (isLite) {
      contractsQuery = contractsQuery.select(
        "contractNumber isDispatched clientId unitId driverId deliveryDriverId returnDriverId personalizedPersonName additionalDriverName additionalDriverPhone contractType rentalType customerType startDate endDate checkoutTime checkinTime deliveredAt handoverCompletedAt returnedAt depositAmount advancePayment totalAmount status createdAt updatedAt deliveryStatus paymentMethod paymentStatus pickupLocation dropoffLocation totalDays handoverEmailSent handoverEmailSentAt handoverEmailSentTo"
      );
    } else if (!isFull) {
      contractsQuery = contractsQuery.select(
        "-adminSignature -customerSignature -returnCustomerSignature -inspectionPhotos -returnPhotos -damagePhotos -moneyPhotos -returnMoneyPhotos -privacyConsentDoc"
      );
    }

    if (page && limit) {
      contractsQuery = contractsQuery.skip((page - 1) * limit).limit(limit);
    }

    const statsPromise = skipStats
      ? Promise.resolve(null)
      : Contract.aggregate([
          ...(Object.keys(statsFilter).length > 0 ? [{ $match: statsFilter }] : []),
          {
            $facet: {
              active: [{ $match: { status: "Active" } }, { $count: "count" }],
              draft: [{ $match: { status: "Draft" } }, { $count: "count" }],
              completedMonth: [
                {
                  $match: {
                    status: "Completed",
                    updatedAt: { $gte: startOfMonth },
                    contractType: { $ne: "Personalized" },
                    personalizedPersonName: { $in: [null, ""] },
                  },
                },
                { $count: "count" },
              ],
              cancelled: [{ $match: { status: "Cancelled" } }, { $count: "count" }],
            },
          },
        ]);

    const totalCountPromise = page && limit ? Contract.countDocuments(filter) : Promise.resolve(null);

    // Stage 1: Fetch contracts, pagination count, and aggregated stats in parallel
    const [contracts, countedTotal, statsAgg] = await Promise.all([
      contractsQuery.lean(),
      totalCountPromise,
      statsPromise,
    ]);

    const totalCount = countedTotal !== null ? countedTotal : contracts.length;
    const statsFacet = statsAgg?.[0];
    const stats = statsFacet
      ? {
          activeContracts: statsFacet.active?.[0]?.count || 0,
          pendingSignatures: statsFacet.draft?.[0]?.count || 0,
          completedThisMonth: statsFacet.completedMonth?.[0]?.count || 0,
          cancelled: statsFacet.cancelled?.[0]?.count || 0,
        }
      : { ...emptyResponse.stats };

    // Stage 2: Batch-resolve related Client, Unit, and User docs in parallel (3 queries max instead of 5 sequential .populate() calls)
    const clientIdSet = new Set<string>();
    const unitIdSet = new Set<string>();
    const userIdSet = new Set<string>();

    for (const c of contracts as any[]) {
      if (c.clientId && mongoose.Types.ObjectId.isValid(String(c.clientId))) {
        clientIdSet.add(String(c.clientId));
      }
      if (c.unitId && mongoose.Types.ObjectId.isValid(String(c.unitId))) {
        unitIdSet.add(String(c.unitId));
      }
      for (const uid of [c.driverId, c.deliveryDriverId, c.returnDriverId]) {
        if (uid && mongoose.Types.ObjectId.isValid(String(uid))) {
          userIdSet.add(String(uid));
        }
      }
    }

    const [clientsList, unitsList, usersList] = await Promise.all([
      clientIdSet.size > 0
        ? Client.find({ _id: { $in: Array.from(clientIdSet) } })
            .select(
              isLite
                ? "name phone"
                : "name phone email passportNumber licenseNumber licenseExpiry idNumber nationality address clientType licenseIssuedDate licenseIssuedBy"
            )
            .lean()
        : Promise.resolve([]),
      unitIdSet.size > 0
        ? Unit.find({ _id: { $in: Array.from(unitIdSet) } })
            .select(
              isLite
                ? "make model plate mileage color year fuelType"
                : isFull
                ? "make model plate mileage images color year fuelType"
                : { make: 1, model: 1, plate: 1, mileage: 1, color: 1, year: 1, fuelType: 1, images: { $slice: 1 } }
            )
            .lean()
        : Promise.resolve([]),
      userIdSet.size > 0
        ? User.find({ _id: { $in: Array.from(userIdSet) } }).select("name").lean()
        : Promise.resolve([]),
    ]);

    const clientMap = new Map<string, any>(clientsList.map((doc: any) => [doc._id.toString(), doc]));
    const unitMap = new Map<string, any>(unitsList.map((doc: any) => [doc._id.toString(), doc]));
    const userMap = new Map<string, any>(usersList.map((doc: any) => [doc._id.toString(), doc]));

    const formattedContracts = contracts.map((c: any) => {
      const clientDoc = c.clientId ? clientMap.get(String(c.clientId)) || null : null;
      const unitDoc = c.unitId ? unitMap.get(String(c.unitId)) || null : null;
      const driverDoc = c.driverId ? userMap.get(String(c.driverId)) || null : null;
      const deliveryDriverDoc = c.deliveryDriverId ? userMap.get(String(c.deliveryDriverId)) || null : null;
      const returnDriverDoc = c.returnDriverId ? userMap.get(String(c.returnDriverId)) || null : null;

      return {
        ...c,
        id: c.contractNumber ? String(c.contractNumber) : "Pending",
        contractNumber: c.contractNumber || null,
        isDispatched: Boolean(c.isDispatched || c.contractNumber || c.status === "Active" || c.deliveryStatus === "Delivered"),
        _id: c._id.toString(), // Real ID
        clientId: clientDoc?._id?.toString() || (c.clientId ? String(c.clientId) : ""),
        clientObj: clientDoc,
        unitId: unitDoc?._id?.toString() || (c.unitId ? String(c.unitId) : ""),
        driverId: driverDoc?._id?.toString() || (c.driverId ? String(c.driverId) : ""),
        deliveryDriverId: deliveryDriverDoc?._id?.toString() || (c.deliveryDriverId ? String(c.deliveryDriverId) : ""),
        returnDriverId: returnDriverDoc?._id?.toString() || (c.returnDriverId ? String(c.returnDriverId) : ""),
        customer: c.personalizedPersonName || clientDoc?.name || (c.contractType === "Personalized" ? (c.additionalDriverName || "Personal Use") : "Unknown"),
        personalizedPersonName: c.personalizedPersonName || "",
        customerPhone: clientDoc?.phone || c.additionalDriverPhone || "",
        customerAddress: clientDoc?.address || c.pickupLocation || "",
        customerEmail: clientDoc?.email || "",
        customerIdNumber: clientDoc?.idNumber || clientDoc?.passportNumber || "",
        customerNationality: clientDoc?.nationality || "",
        customerLicense: clientDoc?.licenseNumber || c.additionalDriverLicense || "",
        customerLicenseExpiry: clientDoc?.licenseExpiry || c.additionalDriverExpiry || "",
        customerLicenseIssuedDate: clientDoc?.licenseIssuedDate || c.additionalDriverIssuedAt || "",
        driver: c.contractType === "Personalized" ? "Personal Use" : (deliveryDriverDoc?.name || driverDoc?.name || "None"),
        deliveryDriver: c.contractType === "Personalized" ? "Personal Use" : (deliveryDriverDoc?.name || (driverDoc && !returnDriverDoc ? driverDoc.name : "None")),
        returnDriver: returnDriverDoc?.name || "None",
        vehicle: unitDoc ? `${unitDoc.make} ${unitDoc.model} (${unitDoc.plate})` : "Unknown Vehicle",
        vehiclePlate: unitDoc?.plate || "",
        vehicleColor: unitDoc?.color || "",
        vehicleYear: unitDoc?.year || "",
        vehicleFuel: unitDoc?.fuelType || "",
        vehicleImage: unitDoc?.images?.[0] || null,
        unitMileage: c.checkoutMileage !== undefined ? c.checkoutMileage : (unitDoc?.mileage || 0),
        depositAmount: Number(c.depositAmount) || 0,
        rawStartDate: c.startDate,
        rawEndDate: c.endDate,
        checkoutTime: c.checkoutTime || "08:00 AM",
        checkinTime: c.checkinTime || "",
        deliveredAt: c.deliveredAt || null,
        handoverCompletedAt: c.handoverCompletedAt || null,
        returnedAt: c.returnedAt || (c.status === "Completed" ? (c.updatedAt || new Date().toISOString()) : null),
        startDate: formatDateWords(c.startDate),
        endDate: formatDateWords(c.endDate),
        deposit: `$${c.depositAmount || 0}`,
        advancePayment: c.advancePayment || 0,
        rentAmount: `$${c.totalAmount || 0}`,
        status: c.status,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt || null,
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
        handoverEmailSent: Boolean(c.handoverEmailSent),
        handoverEmailSentAt: c.handoverEmailSentAt || null,
        handoverEmailSentTo: c.handoverEmailSentTo || "",
      };
    });

    return NextResponse.json({
      contracts: formattedContracts,
      stats,
      totalCount,
      totalPages: limit ? Math.ceil(totalCount / limit) : 1,
      page: page || 1,
      limit: limit || totalCount,
    });
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
    const currentUserId = (session?.user as any)?.id;

    const body = await req.json();

    // Calculate total days using canonical UAE (Asia/Dubai) calendar dates
    const start = parseContractDateToUTCMidnight(body.startDate);
    const end = parseContractDateToUTCMidnight(body.endDate);

    if (!start || !end) {
      return NextResponse.json({ error: "Invalid start or end date." }, { status: 400 });
    }

    if (start > end) {
      return NextResponse.json(
        { error: "Start date must be before or equal to expected end date. (تاريخ البداية يجب أن يكون قبل أو نفس تاريخ النهاية)" },
        { status: 400 }
      );
    }

    const days = calculateRentalDays(start, end, body.checkoutTime, body.checkinTime);
    
    const isPersonalized = body.contractType === "Personalized";

    // Fallback daily rate if not provided in request (0 for Personalized contracts)
    const dailyRate = isPersonalized
      ? 0
      : (body.dailyRate !== undefined && body.dailyRate !== null && !isNaN(Number(body.dailyRate)) ? Number(body.dailyRate) : 50);

    // Retrieve auxiliary fees (0 for Personalized contracts)
    const babySeatFees = isPersonalized ? 0 : (Number(body.babySeatFees) || 0);
    const tintingFees = isPersonalized ? 0 : (Number(body.tintingFees) || 0);
    const deliveryCharges = isPersonalized ? 0 : (Number(body.deliveryCharges) || 0);
    const salikFees = isPersonalized ? 0 : (Number(body.salikFees) || 0);
    const cleaningFees = isPersonalized ? 0 : (Number(body.cleaningFees) || 0);

    const totalAmount = isPersonalized
      ? 0
      : (body.totalAmount !== undefined && body.totalAmount !== null && !isNaN(Number(body.totalAmount))
          ? Number(body.totalAmount)
          : ((days * dailyRate) + babySeatFees + tintingFees + deliveryCharges + salikFees + cleaningFees));

    // Validate that the vehicle exists and is currently Available
    const unitDoc = await Unit.findById(body.unitId);
    if (!unitDoc) {
      return NextResponse.json({ error: "Selected vehicle not found." }, { status: 404 });
    }

    if (unitDoc.status === "Maintenance" || unitDoc.status === "Out of Service") {
      return NextResponse.json(
        { error: `Vehicle (${unitDoc.make} ${unitDoc.model} - ${unitDoc.plate}) is currently in ${unitDoc.status} and cannot be booked.` },
        { status: 400 }
      );
    }

    // Check if vehicle has any overlapping booking/contract during requested dates
    const conflictingContract: any = await checkContractDateOverlap({
      unitId: body.unitId,
      startDate: start,
      endDate: end,
      checkoutTime: body.checkoutTime,
      checkinTime: body.checkinTime,
    });

    if (conflictingContract) {
      const conflictEnd = formatDateWords(conflictingContract.endDate);
      const returnHour = conflictingContract.checkinTime || conflictingContract.checkoutTime || "10:00 AM";
      return NextResponse.json(
        { error: `Date Conflict: Vehicle (${unitDoc.make} ${unitDoc.model} - ${unitDoc.plate}) is booked until ${conflictEnd} (${returnHour}). Please select a checkout time after ${returnHour} or choose another car.` },
        { status: 400 }
      );
    }

    const checkoutMileage = body.checkoutMileage !== undefined && body.checkoutMileage !== "" && Number(body.checkoutMileage) >= 0
      ? Number(body.checkoutMileage)
      : (unitDoc.mileage || 0);

    // If admin enters a higher mileage, sync vehicle unit's mileage
    if (checkoutMileage > (unitDoc.mileage || 0)) {
      unitDoc.mileage = checkoutMileage;
      await unitDoc.save();
    }

    // Drivers can create contracts directly that are automatically active and delivered with no handover
    let isDriverUser = userRole === "driver" || Boolean(body.isDriver);
    if (!isDriverUser && currentUserId) {
      const driverDoc = await User.findOne({ _id: currentUserId, role: "driver" }).lean();
      if (driverDoc) isDriverUser = true;
    }

    const contractType = isDriverUser ? (body.contractType || "Shop") : (body.contractType || "Delivery");

    // For Shop contracts created by Admin, clientId is required
    // For Driver or Personalized, clientId is saved if provided
    if (contractType === "Shop" && !isDriverUser && !body.clientId) {
      return NextResponse.json({ error: "Client is required for Shop contracts." }, { status: 400 });
    }

    if (contractType === "Personalized" && !body.personalizedPersonName && !body.additionalDriverName && !body.notes && !body.clientId) {
      return NextResponse.json({ error: "Please enter who took the car (اسم الشخص المستلم للسيارة)." }, { status: 400 });
    }

    const deliveryDriverId = isDriverUser 
      ? (currentUserId || body.deliveryDriverId) 
      : (body.deliveryDriverId || body.driverId || null);
    const returnDriverId = body.returnDriverId || null;
    const mainDriverId = deliveryDriverId || returnDriverId || null;

    // For Delivery contracts created by Admin, a driver must be assigned
    if (contractType === "Delivery" && !isDriverUser && !deliveryDriverId) {
      return NextResponse.json({ error: "A delivery driver must be assigned for Delivery contracts." }, { status: 400 });
    }

    // Contracts created by Admin start as Draft/Pending until dispatched/handed over.
    // Contracts created by a Driver or Personalized are Active and Delivered automatically with NO handover required!
    let initialStatus: "Draft" | "Active" | "Completed" | "Cancelled" = "Draft";
    let initialDeliveryStatus: "Pending" | "Delivered" | "Returned" = "Pending";
    let isDispatched = isDriverUser ? true : Boolean(body.isDispatched);
    let assignedContractNumber: number | undefined = undefined;

    // Personalized contracts and Driver-created contracts are active and delivered immediately (no pending handover steps)
    if (contractType === "Personalized" || isDriverUser) {
      initialStatus = "Active";
      initialDeliveryStatus = "Delivered";
      isDispatched = true;

      const lastContract = await Contract.findOne({ contractNumber: { $exists: true, $ne: null } })
        .sort({ contractNumber: -1 })
        .select("contractNumber")
        .lean();

      const nextContractNumber =
        lastContract && typeof (lastContract as any).contractNumber === "number" && (lastContract as any).contractNumber >= 2240
          ? (lastContract as any).contractNumber + 1
          : 2240;
      assignedContractNumber = nextContractNumber;
    }

    const contract = await Contract.create({
      contractNumber: assignedContractNumber,
      clientId: body.clientId || null,
      personalizedPersonName: body.personalizedPersonName || (contractType === "Personalized" ? (body.additionalDriverName || body.notes) : undefined),
      unitId: body.unitId,
      contractType: contractType,
      isDispatched: isDispatched,
      rentalType: body.rentalType || (days >= 30 ? "Monthly" : "Daily"),
      customerType: body.customerType || "B2C",
      driverId: mainDriverId,
      deliveryDriverId: deliveryDriverId,
      returnDriverId: returnDriverId,
      checkoutMileage,
      checkoutFuelLevel: body.checkoutFuelLevel !== undefined ? Number(body.checkoutFuelLevel) : 100,
      startDate: start,
      endDate: end,
      dailyRate: isPersonalized ? 0 : (body.dailyRate !== undefined && body.dailyRate !== null ? Number(body.dailyRate) : dailyRate),
      dailyKmLimit: isPersonalized ? 0 : (body.dailyKmLimit || 0),
      pricePerExtraKm: isPersonalized ? 0 : (body.pricePerExtraKm || 0),
      totalDays: days,
      totalAmount: isPersonalized ? 0 : totalAmount,
      advancePayment: isPersonalized ? 0 : (Number(body.advancePayment) || 0),
      depositAmount: isPersonalized ? 0 : (body.depositAmount || 0),
      pickupLocation: body.pickupLocation || body.deliveryLocation || body.location || "Main Office",
      dropoffLocation: body.dropoffLocation || body.returnLocation || "",
      status: initialStatus,
      notes: body.notes || "",
      returnNotes: body.returnNotes || "",
      checkoutTime: body.checkoutTime || "08:00 AM",
      checkinTime: body.checkinTime || "",
      babySeatFees,
      tintingFees,
      deliveryCharges,
      salikFees,
      cleaningFees,
      customerSignature: body.customerSignature,
      adminSignature: body.adminSignature || "/images/admin-signature.png",
      inspectionPhotos: body.inspectionPhotos || [],
      moneyPhotos: body.moneyPhotos || [],
      deliveryStatus: initialDeliveryStatus,
      deliveredBy: initialDeliveryStatus === "Delivered" ? (isDriverUser ? (userName || "Driver") : (body.deliveredBy || undefined)) : undefined,
      deliveredAt: initialDeliveryStatus === "Delivered" ? (body.deliveredAt ? new Date(body.deliveredAt) : new Date()) : undefined,
      handoverCompletedAt: isDriverUser ? new Date().toISOString() : (body.handoverCompletedAt || undefined),
      paymentMethod: isPersonalized ? "Personal / Free" : (body.paymentMethod || "Cash"),
      paymentStatus: isPersonalized ? "Paid" : (body.paymentStatus || (Number(body.advancePayment) >= totalAmount ? "Paid" : (Number(body.advancePayment) > 0 ? "Partial" : "Pending"))),
      additionalDriverName: body.additionalDriverName || "",
      additionalDriverLicense: body.additionalDriverLicense || "",
      additionalDriverNationality: body.additionalDriverNationality || "",
      additionalDriverPhone: body.additionalDriverPhone || "",
      additionalDriverExpiry: body.additionalDriverExpiry || "",
      additionalDriverIssuedAt: body.additionalDriverIssuedAt || "",
    });

    if (initialDeliveryStatus === "Delivered" && hasAnyValidPhotos(body.inspectionPhotos)) {
      try {
        const prevReturnContract = (await Contract.findOne({
          unitId: contract.unitId,
          status: { $ne: "Cancelled" },
          returnPhotos: { $elemMatch: { $nin: [null, ""] } },
        })
          .sort({ returnedAt: -1, updatedAt: -1, startDate: -1, createdAt: -1 })
          .select("returnPhotos")
          .lean()) as any;
        const mergedImages = mergeHandoverAndReturnImages({
          handoverPhotos: body.inspectionPhotos,
          returnPhotos: prevReturnContract?.returnPhotos || [],
          fallbackUnitImages: unitDoc?.images,
        });
        if (mergedImages.length > 0) {
          await Unit.findByIdAndUpdate(contract.unitId, {
            images: mergedImages,
            imagesUpdatedManuallyAt: null,
          });
        }
      } catch (imgSyncErr) {
        console.warn("Failed to merge unit images on contract creation:", imgSyncErr);
      }
    }

    if (contractType === "Personalized" || isDriverUser) {
      try {
        await syncUnitStatuses(contract.unitId);
      } catch (syncErr) {
        console.error("Failed to sync unit status for contract:", syncErr);
      }
    }

    // Automatically create a Notification for the new contract
    try {
      const clientNameForNotif = body.clientName || "Client";
      const vehicleDesc = unitDoc ? `${unitDoc.make} ${unitDoc.model}` : "Vehicle";
      await Notification.create({
        title: "New Booking Created",
        message: `New booking created for ${clientNameForNotif} (${vehicleDesc}).`,
        type: "contract"
      });

      // If scheduled to start tomorrow (in UAE calendar time), create a handover reminder notification immediately
      const dubaiTomorrowISO = addDaysToISODate(getBusinessTodayISO(), 1);
      const contractStartISO = formatDateToInput(contract.startDate);

      if (contractStartISO === dubaiTomorrowISO) {
        const contractNum = contract.contractNumber 
          ? `#${contract.contractNumber}` 
          : `#${contract._id.toString().substring(0, 8).toUpperCase()}`;
        const dateFormatted = formatDateWords(contract.startDate);
        const vehicle = unitDoc ? `${unitDoc.make} ${unitDoc.model} (${unitDoc.plate || ""})`.trim() : "Vehicle";
        
        const clientNameForNotif = body.clientName || "Client";
        const claimedReminder = await Contract.findOneAndUpdate(
          { _id: contract._id, reminderSentTomorrow: { $ne: true } },
          { $set: { reminderSentTomorrow: true } }
        );
        if (!claimedReminder) throw new Error("__reminder_already_sent__");
        await Notification.create({
          title: `Handover Reminder (Tomorrow): ${clientNameForNotif} — ${vehicle}`,
          message: `Scheduled vehicle handover for ${clientNameForNotif} (${vehicle}) starts tomorrow (${dateFormatted}). Please ensure vehicle is ready for delivery.`,
          type: "reminder",
          read: false,
        });

        // Dispatch Gmail + WhatsApp reminder immediately to Admin
        sendHandoverReminderNotification(contract._id.toString(), "Tomorrow").catch((dispatchErr) => {
          console.error("Failed to dispatch Gmail/WhatsApp reminder on create:", dispatchErr);
        });
      }
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

    // Synchronize vehicle status: if contract starts today or in past, it becomes Rented; if it starts in the future, it stays Available until the start date arrives
    await syncUnitStatuses(body.unitId);

    // Automatically send contract notification to client:
    // - Handover/Delivered contracts ("initial") only auto-send WhatsApp; Gmail PDF is triggered manually from Actions
    // - For admin advance reservations, send order confirmation ("created")
    const clientNotificationType = (isDriverUser || Boolean(body.isDriver) || Boolean(body.notifyClient) || initialDeliveryStatus === "Delivered") ? "initial" : "created";
    const clientNotificationOptions = clientNotificationType === "initial"
      ? { sendEmail: false, sendWhatsApp: true }
      : { sendEmail: true, sendWhatsApp: true };
    sendClientContractNotification(contract._id.toString(), clientNotificationType, clientNotificationOptions).catch((notifErr) => {
      console.error(`Failed to dispatch client ${clientNotificationType} notification:`, notifErr);
    });

    // Notify admin when driver delivers/creates an active contract directly
    if (isDriverUser || initialDeliveryStatus === "Delivered") {
      try {
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        fetch(`${baseUrl}/api/contracts/notify-admin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contractId: contract._id.toString(), type: "vehicle_delivered" }),
        }).catch(err => console.error("Failed to notify admin on driver contract delivery:", err));
      } catch (e) {
        console.error("Admin notify trigger failed:", e);
      }
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

