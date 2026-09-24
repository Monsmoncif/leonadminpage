export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Client } from "@/models/Client";
import { Contract } from "@/models/Contract";
import { Unit } from "@/models/Unit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    const client = await Client.findById(id).lean();
    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }
    
    const _u = Unit; // ensure Unit model is loaded for population
    const contracts = await Contract.find({ clientId: id })
      .sort({ createdAt: -1 })
      .populate({ path: "unitId", select: "make model plate images" })
      .lean();

    return NextResponse.json({ ...client, contracts });
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
