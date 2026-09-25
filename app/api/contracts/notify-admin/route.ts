import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Contract } from "@/models/Contract";
import { User } from "@/models/User";
import { Client } from "@/models/Client";
import { Unit } from "@/models/Unit";
import nodemailer from "nodemailer";
import { sendWhatsApp } from "@/lib/whatsapp";

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

    const contractNum = contract._id.toString().substring(0, 8).toUpperCase();
    const vehicleName = contract.unitId ? `${contract.unitId.make} ${contract.unitId.model}` : "Vehicle";
    const vehiclePlate = contract.unitId?.plate || "";
    const clientName = contract.clientId?.name || "Client";
    const isDelivered = type === "vehicle_delivered";
    const eventTitle = isDelivered ? "Vehicle Delivered to Client ✅" : "Vehicle Returned & Collected ✅";
    const driverName = isDelivered 
      ? (contract.deliveryDriverId?.name || "Driver") 
      : (contract.returnDriverId?.name || "Driver");

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

        const emailHtml = `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a2e; line-height: 1.7;">
            <div style="background: ${isDelivered ? '#10b981' : '#3b82f6'}; padding: 24px 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 20px;">${eventTitle}</h1>
              <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 14px;">Contract #${contractNum}</p>
            </div>
            
            <div style="padding: 28px 30px; background: #f8fafc; border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px; margin: 0 0 20px;">Hello <strong>Admin</strong>,</p>
              <p style="font-size: 14px;">${isDelivered 
                ? `Driver <strong>${driverName}</strong> has successfully delivered the vehicle to the client.`
                : `Driver <strong>${driverName}</strong> has successfully picked up and returned the vehicle.`
              }</p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 10px 0; color: #64748b; width: 140px;">Vehicle</td>
                  <td style="padding: 10px 0; font-weight: 600;">${vehicleName} (${vehiclePlate})</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 10px 0; color: #64748b;">Client</td>
                  <td style="padding: 10px 0; font-weight: 600;">${clientName}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 10px 0; color: #64748b;">Driver</td>
                  <td style="padding: 10px 0; font-weight: 600;">${driverName}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 10px 0; color: #64748b;">Event</td>
                  <td style="padding: 10px 0; font-weight: 600;">${isDelivered ? 'Vehicle handed over to client' : 'Vehicle collected from client'}</td>
                </tr>
                ${!isDelivered ? `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 10px 0; color: #64748b;">Rest of Money Collected</td>
                  <td style="padding: 10px 0; font-weight: 700; color: #059669;">$${contract.returnAmountCollected !== undefined ? contract.returnAmountCollected : 0} (${contract.returnPaymentMethod || "Cash"}) — Confirmed by Driver</td>
                </tr>
                ` : `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 10px 0; color: #64748b;">Deposit Collected</td>
                  <td style="padding: 10px 0; font-weight: 700; color: #059669;">$${contract.depositAmount || 0} — Confirmed by Driver</td>
                </tr>
                `}
              </table>
              
              <p style="font-size: 13px; color: #64748b; margin-top: 24px;">— Leon Rent Car Notification</p>
            </div>
          </div>
        `;

        await transporter.sendMail({
          from: `"Leon Rent Car Dispatch" <${process.env.SMTP_USER}>`,
          to: adminEmail,
          subject: `${isDelivered ? '✅' : '🔄'} ${isDelivered ? 'Vehicle Delivered' : 'Vehicle Returned & Settled'} — #${contractNum} | ${vehicleName}`,
          html: emailHtml,
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
        ? `💵 *Security Deposit Collected:* $${contract.depositAmount || 0}`
        : `💰 *Rest of Money Collected:* $${contract.returnAmountCollected !== undefined ? contract.returnAmountCollected : 0} (${contract.returnPaymentMethod || "Cash"})`;

      const whatsappMsg = `${isDelivered ? '✅' : '🔄'} *${eventTitle}*\n\n` +
        `📄 *Contract:* #${contractNum}\n` +
        `🚙 *Vehicle:* ${vehicleName}${vehiclePlate ? ` (${vehiclePlate})` : ''}\n` +
        `👤 *Client:* ${clientName}\n` +
        `👨‍✈️ *Driver:* ${driverName}\n` +
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
