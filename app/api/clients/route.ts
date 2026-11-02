export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Client } from "@/models/Client";
import { Contract } from "@/models/Contract";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const isFullDocs = req.nextUrl.searchParams.get("withDocuments") === "true";
    let query = Client.find().sort({ createdAt: -1 });
    if (!isFullDocs) {
      query = query.select("-documents");
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Run client query and stats counting in parallel using database indexes
    const [clients, totalCustomers, newThisMonth, activeRentals, blacklisted] = await Promise.all([
      query.lean(),
      Client.countDocuments(),
      Client.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Contract.countDocuments({ status: "Active" }),
      Client.countDocuments({ status: "Blacklisted" }),
    ]);

    const stats = {
      totalCustomers,
      newThisMonth,
      activeRentals,
      blacklisted,
    };

    return NextResponse.json({ clients, stats });
  } catch (error: any) {
    console.warn(
      "Clients API: MongoDB not available, returning empty data.",
      error.message
    );
    return NextResponse.json({
      clients: [],
      stats: {
        totalCustomers: 0,
        newThisMonth: 0,
        activeRentals: 0,
        blacklisted: 0,
      },
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await connectDB();

    // Ensure email is properly formatted or empty string if not supplied
    if (!body.email || typeof body.email !== "string" || !body.email.trim()) {
      body.email = "";
    } else {
      body.email = body.email.trim();
    }

    // Handle B2B Corporate Clients (No personal ID or driving license required)
    const isCorporate = body.customerType === "B2B" || body.clientType === "Corporate";
    if (isCorporate) {
      body.customerType = "B2B";
      body.clientType = "Corporate";
      const compName = (body.companyName || body.name || "").trim();
      if (!compName) {
        return NextResponse.json(
          { error: "Company name is required. (يرجى إدخال اسم الشركة)" },
          { status: 400 }
        );
      }
      body.companyName = compName;
      body.name = compName;
      body.nationality = body.nationality || "UAE";
      body.idNumber = body.idNumber || body.trn || body.tradeLicenseNumber || `B2B-${Date.now().toString().slice(-6)}`;
      body.licenseNumber = body.licenseNumber || "B2B-CORP";
      body.address = body.address || "Dubai";
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

      // If it's a Tourist with a valid international license, allow creation
      const hasValidIntlLicense = body.clientType === "Tourist" && 
        body.internationalLicenseNumber && 
        (!body.internationalLicenseExpiry || new Date(body.internationalLicenseExpiry) >= today);

      if (!isNaN(expDate.getTime()) && expDate < today && !hasValidIntlLicense) {
        return NextResponse.json(
          { error: "Driving license is expired. Cannot create client with an expired license. (رخصة القيادة منتهية الصلاحية)" },
          { status: 400 }
        );
      }
    }

    const client = await Client.create(body);
    return NextResponse.json(client, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0];
      if (duplicateField === "idNumber") {
        return NextResponse.json(
          { error: "A client with this Emirates ID, Passport, or TRN already exists." },
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
