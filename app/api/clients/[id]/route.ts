export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Client } from "@/models/Client";
import { Contract } from "@/models/Contract";
import { Unit } from "@/models/Unit";
import { clearPdfCache } from "@/app/api/contracts/[id]/pdf/route";
import { clearConsentPdfCache } from "@/app/api/contracts/[id]/consent-pdf/route";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Invalid client ID" }, { status: 400 });
    }

    await connectDB();
    const _u = Unit; // ensure Unit model is loaded for population

    // Execute client query and lightweight contracts query in parallel
    const [client, contracts] = await Promise.all([
      Client.findById(id).lean(),
      Contract.find({ clientId: id })
        .sort({ createdAt: -1 })
        .select("_id contractNumber unitId startDate endDate totalAmount status createdAt")
        .populate({ path: "unitId", select: "make model plate" })
        .lean(),
    ]);

    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ...client, contracts: contracts || [] });
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
    await connectDB();

    if (body.email !== undefined) {
      if (!body.email || typeof body.email !== "string" || !body.email.trim()) {
        body.email = "";
      } else {
        body.email = body.email.trim();
      }
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

    // Validate Driving License Expiry
    if (body.licenseExpiry && typeof body.licenseExpiry === "string" && body.licenseExpiry.trim()) {
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

    return NextResponse.json(client);
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
