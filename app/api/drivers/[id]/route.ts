export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import { Driver } from "@/models/Driver";
import { Contract } from "@/models/Contract";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const resolvedParams = await params;
    const { id } = resolvedParams;

    let driver: any = null;
    let user: any = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      driver = await Driver.findById(id).lean();
      if (!driver) {
        user = await User.findById(id).lean();
        if (user) {
          driver = await Driver.findOne({ email: user.email }).lean();
        }
      }
    } else {
      driver = await Driver.findOne({ $or: [{ driverId: id }, { email: id }] }).lean();
      if (!driver) {
        user = await User.findOne({ $or: [{ email: id }, { phone: id }] }).lean();
        if (user) {
          driver = await Driver.findOne({ email: user.email }).lean();
        }
      }
    }

    if (!driver && !user) {
      return NextResponse.json(
        { error: "Driver not found" },
        { status: 404 }
      );
    }

    const email = driver?.email || user?.email;
    if (!user && email) {
      user = await User.findOne({ email }).lean();
    }

    let completedContracts = 0;
    const driverIdStr = user?._id || driver?._id;
    if (driverIdStr) {
      completedContracts = await Contract.countDocuments({
        $or: [
          { driverId: driverIdStr },
          { deliveryDriverId: driverIdStr },
          { returnDriverId: driverIdStr },
        ],
        status: "Completed",
      });
    }

    const finalDriver = driver || {
      _id: user._id,
      userId: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      status: user.status === "inactive" ? "Deactivated" : "Active",
      driverId: `DRV-${String(user._id).substring(18, 24).toUpperCase()}`,
      license: "Standard",
      licenseExpiry: "2028-12-31",
      createdAt: user.createdAt,
    };

    return NextResponse.json({ ...finalDriver, completedContracts }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching driver:", error);
    return NextResponse.json(
      { error: "Failed to fetch driver", message: error.message },
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
    const body = await request.json();
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const { password, ...driverData } = body;

    let driverDoc: any = null;
    let userDoc: any = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      driverDoc = await Driver.findById(id);
      if (!driverDoc) {
        userDoc = await User.findById(id);
        if (userDoc?.email) {
          driverDoc = await Driver.findOne({ email: userDoc.email });
        }
      }
    } else {
      driverDoc = await Driver.findOne({ $or: [{ driverId: id }, { email: id }] });
    }

    if (!userDoc && driverDoc?.email) {
      userDoc = await User.findOne({ email: driverDoc.email });
    }

    if (!driverDoc && !userDoc) {
      return NextResponse.json(
        { error: "Driver not found" },
        { status: 404 }
      );
    }

    // Check if updating to an existing driverId (if driverId changed)
    if (driverData.driverId && driverDoc) {
      const existingDriver = await Driver.findOne({ driverId: driverData.driverId });
      if (existingDriver && existingDriver._id.toString() !== driverDoc._id.toString()) {
        return NextResponse.json(
          { error: "Driver with this ID already exists" },
          { status: 400 }
        );
      }
    }

    let updatedDriver = null;
    if (driverDoc) {
      updatedDriver = await Driver.findByIdAndUpdate(
        driverDoc._id,
        driverData,
        { new: true, runValidators: true }
      );
    }

    // Also update User account if exists
    if (userDoc) {
      const userUpdates: any = {};
      if (driverData.name) userUpdates.name = driverData.name;
      if (driverData.email) userUpdates.email = driverData.email;
      if (driverData.phone) userUpdates.phone = driverData.phone;
      if (driverData.status) {
        userUpdates.status = driverData.status === "Deactivated" ? "inactive" : "active";
      }
      if (password) {
        userUpdates.password = await bcrypt.hash(password, 10);
      }
      if (Object.keys(userUpdates).length > 0) {
        await User.findByIdAndUpdate(userDoc._id, userUpdates);
      }
    }

    return NextResponse.json(updatedDriver || userDoc, { status: 200 });
  } catch (error: any) {
    console.error("Error updating driver:", error);
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "A driver with this ID already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update driver", message: error.message },
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
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (id === "all") {
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
    }

    let driverDoc: any = null;
    let userDoc: any = null;

    // 1. Try finding by ObjectId in Driver
    if (mongoose.Types.ObjectId.isValid(id)) {
      driverDoc = await Driver.findById(id);
    }

    // 2. If not found in Driver, try finding by ObjectId in User
    if (!driverDoc && mongoose.Types.ObjectId.isValid(id)) {
      userDoc = await User.findById(id);
    }

    // 3. If still not found, try finding by custom driverId or email
    if (!driverDoc && !userDoc) {
      driverDoc = await Driver.findOne({ $or: [{ driverId: id }, { email: id }] });
      if (!driverDoc) {
        userDoc = await User.findOne({ $or: [{ email: id }, { phone: id }] });
      }
    }

    // 4. If driverDoc found, locate corresponding User by email
    if (driverDoc?.email && !userDoc) {
      userDoc = await User.findOne({ email: driverDoc.email });
    }

    // 5. If userDoc found, locate corresponding Driver by email
    if (userDoc?.email && !driverDoc) {
      driverDoc = await Driver.findOne({ email: userDoc.email });
    }

    if (!driverDoc && !userDoc) {
      return NextResponse.json(
        { error: "Driver not found" },
        { status: 404 }
      );
    }

    // Delete Driver record if exists
    if (driverDoc) {
      await Driver.findByIdAndDelete(driverDoc._id);
    }

    // Delete User record if exists
    if (userDoc) {
      await User.findByIdAndDelete(userDoc._id);
    }

    // Unassign deleted driver from pending/draft contracts
    const driverIdsToUnassign = [
      driverDoc?._id,
      userDoc?._id,
    ].filter(Boolean);

    if (driverIdsToUnassign.length > 0) {
      await (Contract as any).updateMany(
        {
          $or: [
            { driverId: { $in: driverIdsToUnassign } },
            { deliveryDriverId: { $in: driverIdsToUnassign } },
            { returnDriverId: { $in: driverIdsToUnassign } },
          ],
          status: { $in: ["Draft"] },
        },
        {
          $unset: { driverId: 1, deliveryDriverId: 1, returnDriverId: 1 },
        }
      );
    }

    return NextResponse.json(
      { message: "Driver deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting driver:", error);
    return NextResponse.json(
      { error: "Failed to delete driver", message: error.message },
      { status: 500 }
    );
  }
}
