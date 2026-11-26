export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { Contract } from "@/models/Contract";
import { Client } from "@/models/Client";
import { Log } from "@/models/Log";
import { sendClientContractNotification } from "@/lib/contract-notifications";
import { clearPdfCache } from "@/lib/pdf-cache";
import { clearPdfJobs } from "@/lib/pdf-generator";

const inFlightHandoverEmails = new Set<string>();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let lockKey: string | null = null;

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = String((session.user as any)?.role || "").toLowerCase();
    if (userRole === "driver") {
      return NextResponse.json(
        { error: "Only administrators or staff can send handover emails manually." },
        { status: 403 }
      );
    }

    await connectDB();
    const resolvedParams = await params;
    const rawId = decodeURIComponent(String(resolvedParams.id || "")).trim();

    if (!rawId) {
      return NextResponse.json({ error: "Contract ID is required" }, { status: 400 });
    }

    let contract: any = null;
    if (mongoose.Types.ObjectId.isValid(rawId)) {
      contract = await Contract.findById(rawId).lean();
    }
    if (!contract && !isNaN(Number(rawId))) {
      contract = await Contract.findOne({ contractNumber: Number(rawId) }).lean();
    }

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    const contractIdStr = contract._id.toString();

    if (
      contract.contractType === "Personalized" ||
      Boolean(contract.personalizedPersonName)
    ) {
      return NextResponse.json(
        { error: "Personalized contracts do not use client handover emails." },
        { status: 400 }
      );
    }

    if (contract.status === "Cancelled") {
      return NextResponse.json(
        { error: "Cannot send handover email for a cancelled contract." },
        { status: 400 }
      );
    }

    if (
      contract.status === "Completed" ||
      contract.deliveryStatus === "Returned" ||
      Boolean(contract.returnedAt)
    ) {
      return NextResponse.json(
        { error: "Handover email cannot be sent for completed contracts." },
        { status: 400 }
      );
    }

    const isHandedOver = Boolean(
      contract.deliveryStatus !== "Pending" &&
        (contract.deliveryStatus === "Delivered" ||
          contract.status === "Active" ||
          contract.deliveredAt)
    );

    if (!isHandedOver) {
      return NextResponse.json(
        { error: "Contract must be handed over / delivered before sending the handover PDF email." },
        { status: 400 }
      );
    }

    if (contract.handoverEmailSent === true) {
      return NextResponse.json(
        {
          error:
            "Handover PDF email has already been sent for this contract. Edit the contract to re-enable sending.",
          alreadySent: true,
        },
        { status: 409 }
      );
    }

    const clientDoc = contract.clientId
      ? ((await Client.findById(contract.clientId).lean()) as any)
      : null;

    if (!clientDoc) {
      return NextResponse.json(
        { error: "Client record not found for this contract." },
        { status: 400 }
      );
    }

    const clientEmail = typeof clientDoc.email === "string" ? clientDoc.email.trim() : "";
    if (!clientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
      return NextResponse.json(
        { error: "Client does not have a valid email address." },
        { status: 400 }
      );
    }

    if (inFlightHandoverEmails.has(contractIdStr)) {
      return NextResponse.json(
        { error: "Handover email is already being sent for this contract." },
        { status: 409 }
      );
    }

    lockKey = contractIdStr;
    inFlightHandoverEmails.add(contractIdStr);

    clearPdfCache(contractIdStr);
    clearPdfJobs(contractIdStr);

    const notifyResult = await sendClientContractNotification(contractIdStr, "initial", {
      sendEmail: true,
      sendWhatsApp: false,
      markHandoverEmailSent: true,
      requirePdfAttachment: true,
    });

    if (!notifyResult.email) {
      return NextResponse.json(
        {
          error:
            notifyResult.error ||
            "Failed to send handover PDF email via Gmail.",
        },
        { status: 500 }
      );
    }

    const updatedContract = (await Contract.findById(contractIdStr)
      .select("handoverEmailSent handoverEmailSentAt handoverEmailSentTo contractNumber")
      .lean()) as any;

    const sentAt = updatedContract?.handoverEmailSentAt || new Date();
    const sentTo = updatedContract?.handoverEmailSentTo || notifyResult.emailSentTo || clientEmail;
    const contractNum =
      updatedContract?.contractNumber ||
      contract.contractNumber ||
      contractIdStr.substring(0, 8).toUpperCase();

    try {
      await Log.create({
        logId: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        user: session.user.name || session.user.email || "Admin",
        role: (session.user as any)?.role || "admin",
        action: "SEND_HANDOVER_EMAIL",
        description: `Sent handover PDF email for Contract #${contractNum} to ${sentTo}.`,
        ip: request.headers.get("x-forwarded-for") || "127.0.0.1",
        type: "other",
      });
    } catch (logErr) {
      console.error("Failed to create audit log for handover email:", logErr);
    }

    return NextResponse.json({
      success: true,
      message: `Handover contract PDF sent via Gmail to ${sentTo}`,
      contractId: contractIdStr,
      contractNumber: contractNum,
      handoverEmailSent: Boolean(updatedContract?.handoverEmailSent ?? true),
      handoverEmailSentAt: sentAt,
      handoverEmailSentTo: sentTo,
    });
  } catch (error: any) {
    console.error("Send Handover Email Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error sending handover email" },
      { status: 500 }
    );
  } finally {
    if (lockKey) {
      inFlightHandoverEmails.delete(lockKey);
    }
  }
}
