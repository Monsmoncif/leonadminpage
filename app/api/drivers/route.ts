export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Driver } from "@/models/Driver";
import { Contract } from "@/models/Contract";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    await connectDB();
    const drivers = await Driver.find({}).sort({ createdAt: -1 }).lean();
    const allContracts = await Contract.find({}).select("driverId deliveryDriverId returnDriverId status").lean();
    const allUsers = await User.find({ role: "driver" }).select("_id name email phone status createdAt").lean();

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
      const driverContracts = allContracts.filter((c: any) => 
        String(c.driverId) === driverIdStr ||
        String(c.deliveryDriverId) === driverIdStr ||
        String(c.returnDriverId) === driverIdStr ||
        String(c.driverId) === String(driver._id)
      );

      return {
        ...driver,
        _id: userId || String(driver._id),
        driverModelId: String(driver._id),
        userId: userId || String(driver._id),
        completedContracts: driverContracts.filter((c: any) => c.status === "Completed").length,
        activeRentals: driverContracts.filter((c: any) => c.status === "Active").length,
      };
    });

    // Also include any User with role "driver" that is not in Driver collection
    for (const u of allUsers) {
      const emailLower = u.email?.toLowerCase();
      if (emailLower && !processedEmails.has(emailLower)) {
        processedEmails.add(emailLower);
        const userIdStr = String(u._id);
        const driverContracts = allContracts.filter((c: any) => 
          String(c.driverId) === userIdStr ||
          String(c.deliveryDriverId) === userIdStr ||
          String(c.returnDriverId) === userIdStr
        );

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
          completedContracts: driverContracts.filter((c: any) => c.status === "Completed").length,
          activeRentals: driverContracts.filter((c: any) => c.status === "Active").length,
          createdAt: u.createdAt
        });
      }
    }

    const contractsHandled = allContracts.length;

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

