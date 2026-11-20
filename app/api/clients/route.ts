export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import { Client } from "@/models/Client";
import { Contract } from "@/models/Contract";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const isDriver = (session?.user as any)?.role === "driver";

    await connectDB();
    const isFullDocs = req.nextUrl.searchParams.get("withDocuments") === "true";
    const isSlim = req.nextUrl.searchParams.get("slim") === "true";
    const skipStats = req.nextUrl.searchParams.get("skipStats") === "true";
    const search = req.nextUrl.searchParams.get("search")?.trim();
    const pageParam = req.nextUrl.searchParams.get("page");
    const limitParam = req.nextUrl.searchParams.get("limit");
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : null;
    const limit = limitParam ? Math.max(1, parseInt(limitParam, 10)) : null;

    let filter: any = {};
    if (search) {
      const escaped = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      const rx = new RegExp(escaped, "i");
      const orConditions: any[] = [
        { name: rx },
        { companyName: rx },
        { idNumber: rx },
        { passportNumber: rx },
        { licenseNumber: rx },
        { nationality: rx },
      ];
      // Prevent drivers from enumerating or finding clients by phone/email
      if (!isDriver) {
        orConditions.push({ email: rx }, { phone: rx });
      }
      filter = { $or: orConditions };
    }

    let query = Client.find(filter).sort({ createdAt: -1 });
    if (isDriver) {
      query = query.select(isSlim || !isFullDocs ? "-documents -__v -phone -email" : "-phone -email");
    } else if (isSlim || !isFullDocs) {
      query = query.select("-documents -__v");
    }

    if (page && limit) {
      query = query.skip((page - 1) * limit).limit(limit);
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [clients, countedTotal, clientStatsAgg, activeRentals] = await Promise.all([
      query.lean(),
      page && limit ? Client.countDocuments(filter) : Promise.resolve(null),
      skipStats
        ? Promise.resolve(null)
        : Client.aggregate([
            {
              $facet: {
                total: [{ $count: "count" }],
                newThisMonth: [{ $match: { createdAt: { $gte: startOfMonth } } }, { $count: "count" }],
                blacklisted: [{ $match: { status: "Blacklisted" } }, { $count: "count" }],
              },
            },
          ]),
      skipStats ? Promise.resolve(0) : Contract.countDocuments({ status: "Active" }),
    ]);

    const totalCount = countedTotal !== null ? countedTotal : clients.length;
    const facetRow = clientStatsAgg?.[0];
    const totalCustomers = facetRow?.total?.[0]?.count || 0;
    const newThisMonth = facetRow?.newThisMonth?.[0]?.count || 0;
    const blacklisted = facetRow?.blacklisted?.[0]?.count || 0;

    const stats = {
      totalCustomers,
      newThisMonth,
      activeRentals,
      blacklisted,
    };

    const responseClients = isDriver
      ? clients.map(({ phone: _p, email: _e, ...rest }: any) => rest)
      : clients;

    return NextResponse.json({
      clients: responseClients,
      stats,
      totalCount,
      totalPages: limit ? Math.max(1, Math.ceil(totalCount / limit)) : 1,
      page: page || 1,
      limit: limit || totalCount,
    });
  } catch (error: any) {
    console.error("Clients API error:", error.message);
    return NextResponse.json(
      { error: "Failed to load clients data", message: error.message },
      { status: 500 }
    );
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
