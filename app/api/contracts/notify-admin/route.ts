import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Contract } from "@/models/Contract";
import { User } from "@/models/User";
import { Client } from "@/models/Client";
import { Unit } from "@/models/Unit";
import nodemailer from "nodemailer";
import { sendWhatsApp } from "@/lib/whatsapp";
import { buildAdminEventNoticeEmail, getEmailLogoAttachment } from "@/lib/email-templates";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { contractId, type } = await req.json();

    if (!contractId || !type) {
      return NextResponse.json({ error: "contractId and type are required" }, { status: 400 });
    }

    // Fetch contract with populated fields
    const _c = Client;
    const _u = Unit;
    const contract = await Contract.findById(contractId)
      .populate({ path: "clientId", select: "name phone", strictPopulate: false })
      .populate({ path: "unitId", select: "make model plate", strictPopulate: false })
      .populate({ path: "deliveryDriverId", select: "name", strictPopulate: false })
      .populate({ path: "returnDriverId", select: "name", strictPopulate: false })
      .lean() as any;

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    const contractNum = contract.contractNumber 
      ? String(contract.contractNumber) 
      : contract._id.toString().substring(0, 8).toUpperCase();

    const vehicleName = contract.unitId ? `${contract.unitId.make} ${contract.unitId.model}` : "Vehicle";
    const vehiclePlate = contract.unitId?.plate || "";
    const clientName = contract.clientId?.name || "Client";
    const isDelivered = type === "vehicle_delivered";
    const eventTitle = isDelivered ? "Vehicle Delivered to Client ✅" : "Vehicle Returned & Collected ✅";

    const isShop = contract.contractType === "Shop" || (!contract.deliveryDriverId && !contract.driverId);
    let driverName = "";
    if (isShop) {
      driverName = "Agency / Shop";
    } else {
      const driverDoc = isDelivered ? contract.deliveryDriverId : (contract.returnDriverId || contract.deliveryDriverId);
      driverName = driverDoc?.name || "Assigned Driver";
      if (driverName.toLowerCase() === "driver") {
        driverName = "Assigned Driver";
      }
    }

    const adminEmail = process.env.SMTP_USER;
    const results = { email: false, whatsapp: false };

    // ===== 1. SEND EMAIL TO ADMIN =====
    if (adminEmail && process.env.SMTP_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || "smtp.gmail.com",
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: process.env.SMTP_SECURE === "true",
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        const { subject, html: emailHtml } = buildAdminEventNoticeEmail({
          contractNumber: contractNum,
          vehicleName,
          vehiclePlate,
          clientName,
          driverName,
          contractType: contract.contractType,
          location: contract.pickupLocation || "Agency Office",
          isDelivered,
          collectedAmount: !isDelivered ? (contract.returnAmountCollected !== undefined ? contract.returnAmountCollected : 0) : undefined,
          paymentMethod: contract.returnPaymentMethod || "Cash",
          depositAmount: isDelivered ? (contract.depositAmount || 0) : undefined,
        });

        const logoAtt = getEmailLogoAttachment();
        await transporter.sendMail({
          from: `"Leon Rent Car Dispatch" <${process.env.SMTP_USER}>`,
          to: adminEmail,
          subject,
          html: emailHtml,
          attachments: logoAtt ? [logoAtt] : [],
        });
        results.email = true;
      } catch (emailErr) {
        console.error("Failed to send admin email notification:", emailErr);
      }
    }

    // ===== 2. SEND WHATSAPP TO ADMIN =====
    try {
      // Find admin users with phone numbers
      const admins = await User.find({ role: "admin", phone: { $exists: true, $ne: "" } }).select("phone name").lean();
      
      const moneyLine = isDelivered
        ? `💵 *Security Deposit Collected:* ${(Number(contract.depositAmount) || 0).toLocaleString()} DZD`
        : `💰 *Rest of Money Collected:* ${(Number(contract.returnAmountCollected) || 0).toLocaleString()} DZD (${contract.returnPaymentMethod || "Cash"})`;

      const whatsappMsg = `${isDelivered ? '✅' : '🔄'} *${eventTitle}*\n\n` +
        `📄 *Contract / رقم العقد:* #${contractNum}\n` +
        `🚙 *Vehicle / السيارة:* ${vehicleName}${vehiclePlate ? ` (${vehiclePlate})` : ''}\n` +
        `👤 *Client / العميل:* ${clientName}\n` +
        (isShop
          ? `🏢 *Handover / الاستلام:* Agency / Shop (المكتب / الوكالة)\n`
          : `👨‍✈️ *Driver / السائق:* ${driverName}\n`) +
        `${moneyLine}\n\n` +
        `— *Leon Rent Car*`;

      for (const admin of admins) {
        if (admin.phone) {
          const waResult = await sendWhatsApp({
            to: admin.phone,
            message: whatsappMsg,
          });
          if (waResult.success) {
            results.whatsapp = true;
          }
        }
      }
    } catch (waErr) {
      console.error("Failed to send admin WhatsApp notification:", waErr);
    }

    return NextResponse.json({ 
      success: true, 
      results,
      message: `Admin notifications sent — Email: ${results.email ? '✓' : '✗'}, WhatsApp: ${results.whatsapp ? '✓' : '✗'}` 
    });
  } catch (error: any) {
    console.error("Notify Admin Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
