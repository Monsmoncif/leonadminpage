export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Client } from "@/models/Client";
import { Contract } from "@/models/Contract";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const clients = await Client.find().sort({ createdAt: -1 }).lean();
    
    // Count active contracts for all clients
    const activeRentalsCount = await Contract.countDocuments({ status: "Active" });

    // Calculate stats
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      totalCustomers: clients.length,
      newThisMonth: clients.filter(
        (c: any) => new Date(c.createdAt) >= startOfMonth
      ).length,
      activeRentals: activeRentalsCount,
      blacklisted: clients.filter((c: any) => c.status === "Blacklisted").length,
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

    const client = await Client.create(body);
    return NextResponse.json(client, { status: 201 });
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

