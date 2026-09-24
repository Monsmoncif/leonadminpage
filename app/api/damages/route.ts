export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Damage } from "@/models/Damage";
import { Contract } from "@/models/Contract";
import { Unit } from "@/models/Unit";
import { Driver } from "@/models/Driver";
import { User } from "@/models/User";
import { Log } from "@/models/Log";
import { Notification } from "@/models/Notification";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: Request) {
  try {
    await connectDB();
    
    // Explicitly import models to register their schemas in mongoose
    // to prevent Mongoose error: Schema hasn't been registered for model "Unit" / "Contract"
    const _c = Contract;
    const _u = Unit;
    const _d = Driver;
    const _us = User;

    const { searchParams } = new URL(req.url);
    const driverId = searchParams.get("driverId");

    let filter: any = {};
    if (driverId) {
      const driverContracts = await Contract.find({ driverId }).select('_id');
      const contractIds = driverContracts.map(c => c._id);
      filter = {
        $or: [
          { contractId: { $in: contractIds } },
          { reportedById: driverId }
        ]
      };
    }

    const damages = await Damage.find(filter)
      .populate({
        path: "contractId",
        populate: { path: "driverId", select: "name email" }
      })
      .populate("unitId")
      .sort({ createdAt: -1 });

    return NextResponse.json(damages, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching damages:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch damages" },
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
    const userId = (session?.user as any)?.id;

    const body = await req.json();

    // Auto-generate damage ID
    const latest = await Damage.findOne().sort({ createdAt: -1 });
    let newId = "DMG-1001";
    if (latest && latest.damageId) {
      const match = latest.damageId.match(/\d+/);
      if (match) {
        const num = parseInt(match[0]) + 1;
        newId = `DMG-${num.toString().padStart(4, "0")}`;
      }
    }

    const newDamage = await Damage.create({
      ...body,
      reportedById: userId,
      damageId: newId,
    });

    if (newDamage.status === "Pending" && newDamage.unitId) {
      await Unit.findByIdAndUpdate(newDamage.unitId, { status: "Maintenance" });
    }

    try {
      const count = await Log.countDocuments();
      await Log.create({
        logId: `LOG-${(count + 1).toString().padStart(3, '0')}`,
        user: userName,
        role: userRole,
        action: "Damage Reported",
        description: `Damage ${newId} reported.`,
        type: "create",
        ip: "127.0.0.1"
      });

      await Notification.create({
        title: "Damage Reported",
        message: `New damage ${newId} was reported.`,
        type: "alert"
      });
    } catch (e) { console.error("Failed to log damage creation", e); }

    return NextResponse.json(newDamage, { status: 201 });
  } catch (error: any) {
    console.error("Error creating damage:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create damage" },
      { status: 500 }
    );
  }
}

