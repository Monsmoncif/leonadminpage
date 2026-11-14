export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Driver } from "@/models/Driver";
import { Contract } from "@/models/Contract";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const isSlim = searchParams.get("slim") === "true";
    const withDocuments = searchParams.get("withDocuments") === "true";

    let driverQuery = Driver.find({}).sort({ createdAt: -1 });
    if (!withDocuments) {
      driverQuery = driverQuery.select("-documents -password");
    } else {
      driverQuery = driverQuery.select("-password");
    }

    const contractStatsPromise = isSlim
      ? Promise.resolve(null)
      : Contract.aggregate([
          {
            $facet: {
              total: [{ $count: "count" }],
              byDriver: [
                {
                  $project: {
                    status: 1,
                    refs: {
                      $setUnion: [
                        { $cond: [{ $ifNull: ["$driverId", false] }, [{ $toString: "$driverId" }], []] },
                        { $cond: [{ $ifNull: ["$deliveryDriverId", false] }, [{ $toString: "$deliveryDriverId" }], []] },
                        { $cond: [{ $ifNull: ["$returnDriverId", false] }, [{ $toString: "$returnDriverId" }], []] },
                      ],
                    },
                  },
                },
                { $unwind: "$refs" },
                {
                  $group: {
                    _id: "$refs",
                    completedContracts: { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] } },
                    activeRentals: { $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] } },
                  },
                },
              ],
            },
          },
        ]);

    const [drivers, contractAgg, allUsers] = await Promise.all([
      driverQuery.lean(),
      contractStatsPromise,
      User.find({ role: "driver" }).select("_id name email phone status createdAt").lean(),
    ]);

    const countsMap = new Map<string, { completedContracts: number; activeRentals: number }>();
    const facetRes = contractAgg?.[0];
    if (facetRes?.byDriver) {
      for (const row of facetRes.byDriver) {
        countsMap.set(String(row._id), {
          completedContracts: row.completedContracts || 0,
          activeRentals: row.activeRentals || 0,
        });
      }
    }

    const emailToUserId = allUsers.reduce((acc: any, user: any) => {
      if (user.email) acc[user.email.toLowerCase()] = String(user._id);
      return acc;
    }, {});

    const processedEmails = new Set();

    const driversWithStats = drivers.map((driver: any) => {
      const emailLower = driver.email?.toLowerCase();
      const userId = emailToUserId[emailLower];
      if (emailLower) processedEmails.add(emailLower);

      const driverIdStr = userId || String(driver._id);
      const primaryStats = countsMap.get(driverIdStr);
      const fallbackStats = userId && String(driver._id) !== userId ? countsMap.get(String(driver._id)) : undefined;

      return {
        ...driver,
        _id: userId || String(driver._id),
        driverModelId: String(driver._id),
        userId: userId || String(driver._id),
        completedContracts: (primaryStats?.completedContracts || 0) + (fallbackStats?.completedContracts || 0),
        activeRentals: (primaryStats?.activeRentals || 0) + (fallbackStats?.activeRentals || 0),
      };
    });

    // Also include any User with role "driver" that is not in Driver collection
    for (const u of allUsers) {
      const emailLower = u.email?.toLowerCase();
      if (emailLower && !processedEmails.has(emailLower)) {
        processedEmails.add(emailLower);
        const userIdStr = String(u._id);
        const userStats = countsMap.get(userIdStr);

        driversWithStats.push({
          _id: userIdStr,
          userId: userIdStr,
          name: u.name || "Driver",
          email: u.email,
          phone: u.phone || "+213657878987",
          driverId: `DRV-${userIdStr.substring(18, 24).toUpperCase()}`,
          license: "Standard",
          licenseExpiry: "2028-12-31",
          status: u.status === "inactive" ? "Deactivated" : "Active",
          completedContracts: userStats?.completedContracts || 0,
          activeRentals: userStats?.activeRentals || 0,
          documents: [],
          createdAt: u.createdAt
        });
      }
    }

    const contractsHandled = facetRes?.total?.[0]?.count || 0;

    const stats = {
      totalDrivers: driversWithStats.length,
      activeNow: driversWithStats.filter((d: any) => d.status === "Active").length,
      contractsCreated: contractsHandled,
      avgPerformance: 0,
    };

    return NextResponse.json({ drivers: driversWithStats, stats }, { status: 200 });
  } catch (error) {
    console.error("Error fetching drivers:", error);
    return NextResponse.json(
      { error: "Failed to load drivers", message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    // Check if a driver with this ID already exists
    const existingDriver = await Driver.findOne({ driverId: body.driverId });
    if (existingDriver) {
      return NextResponse.json(
        { error: "A driver with this ID already exists" },
        { status: 400 }
      );
    }

    // If password provided, check if user exists and create User for login
    if (body.password) {
      const existingUser = await User.findOne({ email: body.email });
      if (existingUser) {
        return NextResponse.json(
          { error: "A user with this email already exists" },
          { status: 400 }
        );
      }
      
      const hashedPassword = await bcrypt.hash(body.password, 10);
      await User.create({
        name: body.name,
        email: body.email,
        phone: body.phone,
        password: hashedPassword,
        role: "driver",
        status: body.status === "Deactivated" ? "inactive" : "active"
      });
    }

    const { password, ...driverData } = body;
    const newDriver = await Driver.create(driverData);
    return NextResponse.json(newDriver, { status: 201 });
  } catch (error: any) {
    console.error("Error creating driver:", error);
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "A driver with this ID already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create driver" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await connectDB();
    const drivers = await Driver.find({}).lean();
    const emails = drivers.map((d: any) => d.email).filter(Boolean);

    await Driver.deleteMany({});
    await User.deleteMany({
      $or: [
        { role: "driver" },
        { email: { $in: emails } }
      ]
    });

    await (Contract as any).updateMany(
      { status: "Draft" },
      { $unset: { driverId: 1, deliveryDriverId: 1, returnDriverId: 1 } }
    );

    return NextResponse.json(
      { message: "All drivers deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting all drivers:", error);
    return NextResponse.json(
      { error: "Failed to delete all drivers", message: error.message },
      { status: 500 }
    );
  }
}

