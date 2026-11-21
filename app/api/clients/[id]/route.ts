export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Client } from "@/models/Client";
import { Contract } from "@/models/Contract";
import { Unit } from "@/models/Unit";
import { clearPdfCache, clearConsentPdfCache } from "@/lib/pdf-cache";

function redactClientContactForDriver(clientDoc: any) {
  if (!clientDoc || typeof clientDoc !== "object") return clientDoc;
  const plain = typeof clientDoc.toObject === "function" ? clientDoc.toObject() : { ...clientDoc };
  delete plain.phone;
  delete plain.email;
  return plain;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Invalid client ID" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const isDriver = (session?.user as any)?.role === "driver";
    const currentUserId = String((session?.user as any)?.id || "");

    await connectDB();
    const _u = Unit; // ensure Unit model is loaded for population

    const clientQuery = Client.findById(id);
    if (isDriver) {
      clientQuery.select("-phone -email");
    }

    // Execute client query and lightweight contracts query in parallel
    const [client, contracts] = await Promise.all([
      clientQuery.lean(),
      Contract.find({ clientId: id })
        .sort({ createdAt: -1 })
        .select("_id contractNumber unitId startDate endDate status deliveryStatus contractType driverId deliveryDriverId createdAt")
        .populate({ path: "unitId", select: "make model plate" })
        .lean(),
    ]);

    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    const safeClient = isDriver ? redactClientContactForDriver(client) : client;
    const hasNonCancelledContract = (contracts || []).some((c: any) => c.status !== "Cancelled");
    const canDriverEdit = Boolean(
      isDriver &&
        currentUserId &&
        (client as any).createdByRole === "driver" &&
        String((client as any).createdByUserId || "") === currentUserId &&
        !hasNonCancelledContract
    );
    return NextResponse.json({
      ...safeClient,
      contracts: contracts || [],
      ...(isDriver ? { canDriverEdit } : {}),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const session = await getServerSession(authOptions);
    const isDriver = (session?.user as any)?.role === "driver";
    const currentUserId = String((session?.user as any)?.id || "");

    delete body.createdByUserId;
    delete body.createdByRole;

    await connectDB();

    let canEditOwnDraftContact = false;
    if (isDriver) {
      const [existingClient, existingContracts] = await Promise.all([
        Client.findById(id).select("createdByUserId createdByRole").lean() as Promise<any>,
        Contract.find({ clientId: id })
          .select("status deliveryStatus contractType driverId deliveryDriverId")
          .lean() as Promise<any[]>,
      ]);

      if (!existingClient) {
        return NextResponse.json({ error: "Client not found" }, { status: 404 });
      }

      const activeContracts = (existingContracts || []).filter((c: any) => c.status !== "Cancelled");
      const hasPendingDeliveryForDriver = activeContracts.some(
        (c: any) =>
          c.deliveryStatus === "Pending" &&
          c.contractType === "Delivery" &&
          (!currentUserId ||
            (!c.deliveryDriverId && !c.driverId) ||
            String(c.deliveryDriverId || "") === currentUserId ||
            String(c.driverId || "") === currentUserId)
      );
      const createdByThisDriver =
        Boolean(currentUserId) &&
        String(existingClient.createdByUserId || "") === currentUserId &&
        existingClient.createdByRole === "driver";
      const hasAnyContract = activeContracts.length > 0;

      // Once a contract is finished/created for this client (outside an active pending delivery handover), lock driver edits
      if (hasAnyContract && !hasPendingDeliveryForDriver) {
        return NextResponse.json(
          {
            error:
              "Contract already created for this client. Only Admin can edit client details now. (تم إنشاء العقد لهذا العميل بالفعل، لا يمكن للسائق التعديل بعد إتمام العقد)",
          },
          { status: 403 }
        );
      }

      // Prevent editing clients added by admins or other drivers unless assigned a pending delivery
      if (existingClient.createdByUserId && !createdByThisDriver && !hasPendingDeliveryForDriver) {
        return NextResponse.json(
          {
            error:
              "You can only edit clients you added during contract creation before submitting the contract. (يمكنك تعديل العميل الذي أضفته فقط قبل إتمام العقد)",
          },
          { status: 403 }
        );
      }

      // Only the driver who added this uncontracted draft client can fix typos in phone/email before creating the contract;
      // otherwise drivers must never view or overwrite existing client phone/email.
      canEditOwnDraftContact = createdByThisDriver && !hasAnyContract;
      if (!canEditOwnDraftContact) {
        delete body.phone;
        delete body.email;
      }
    }

    if (body.email !== undefined) {
      if (!body.email || typeof body.email !== "string" || !body.email.trim()) {
        body.email = "";
      } else {
        body.email = body.email.trim();
      }
    }

    // Handle B2B Corporate Updates
    const isCorporate = body.customerType === "B2B" || body.clientType === "Corporate";
    if (isCorporate) {
      body.customerType = "B2B";
      body.clientType = "Corporate";
      if (body.companyName) body.name = body.companyName;
      if (body.name && !body.companyName) body.companyName = body.name;
    }

    // Sanitize empty date strings to null so Mongoose does not throw CastError
    const dateFields = [
      "dateOfBirth",
      "idIssuedDate",
      "idExpiry",
      "passportIssuedDate",
      "passportExpiry",
      "licenseIssuedDate",
      "licenseExpiry",
      "internationalLicenseIssuedDate",
      "internationalLicenseExpiry",
      "visaExpiry",
    ];
    for (const f of dateFields) {
      if (body[f] === "" || body[f] === "null" || body[f] === "undefined") {
        body[f] = null;
      }
    }

    // Validate Driving License Expiry (only for individual B2C clients)
    if (!isCorporate && body.licenseExpiry && typeof body.licenseExpiry === "string" && body.licenseExpiry.trim()) {
      const expDate = new Date(body.licenseExpiry);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // If it's a Tourist with a valid international license, allow update
      const hasValidIntlLicense = body.clientType === "Tourist" && 
        body.internationalLicenseNumber && 
        (!body.internationalLicenseExpiry || new Date(body.internationalLicenseExpiry) >= today);

      if (!isNaN(expDate.getTime()) && expDate < today && !hasValidIntlLicense) {
        return NextResponse.json(
          { error: "Driving license is expired. Cannot update client with an expired license. (رخصة القيادة منتهية الصلاحية)" },
          { status: 400 }
        );
      }
    }

    const client = await Client.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });
    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    // Touch all contracts associated with this client so their updatedAt changes and cache is invalidated
    try {
      const mongoose = (await import("mongoose")).default;
      const objId = mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
      await Contract.updateMany(
        { $or: [{ clientId: id }, ...(objId ? [{ clientId: objId }] : [])] },
        { $set: { updatedAt: new Date() } }
      );
      const associatedContracts = await Contract.find({
        $or: [{ clientId: id }, ...(objId ? [{ clientId: objId }] : [])]
      }).select("_id contractNumber").lean();
      for (const c of associatedContracts) {
        clearPdfCache(c._id.toString());
        clearConsentPdfCache(c._id.toString());
        if (c.contractNumber) {
          clearPdfCache(String(c.contractNumber));
          clearConsentPdfCache(String(c.contractNumber));
        }
      }
    } catch (touchErr) {
      console.warn("Could not bump contract updatedAt on client update:", touchErr);
    }

    return NextResponse.json(
      isDriver
        ? { ...redactClientContactForDriver(client), ...(canEditOwnDraftContact ? { canDriverEdit: true } : {}) }
        : client
    );
  } catch (error: any) {
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0];
      if (duplicateField === "idNumber") {
        return NextResponse.json(
          { error: "A client with this Emirates ID or Passport Number already exists." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "A client with these identification details already exists." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.role === "driver") {
      return NextResponse.json({ error: "Drivers cannot delete client records." }, { status: 403 });
    }
    const { id } = await params;
    await connectDB();

    const client = await Client.findByIdAndDelete(id);
    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ message: "Client deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
