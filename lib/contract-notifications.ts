import connectDB from "@/lib/db";
import { Contract } from "@/models/Contract";
import { Client } from "@/models/Client";
import { Unit } from "@/models/Unit";
import { User } from "@/models/User";
import { Driver } from "@/models/Driver";
import { sendWhatsApp } from "@/lib/whatsapp";
import nodemailer from "nodemailer";
import { generateContractPdf, generateContractPdfFromPrintUrl } from "@/lib/pdf-generator";

function getTransporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Sends automated WhatsApp + Gmail notification to Client
 * Supports types: "created" (new booking), "initial" (car delivered), "final" (car returned)
 */
export async function sendClientContractNotification(
  contractId: string,
  type: "created" | "initial" | "final" = "created"
): Promise<{ email: boolean; whatsapp: boolean }> {
  const results = { email: false, whatsapp: false };

  try {
    await connectDB();

    const _c = Client;
    const _u = Unit;
    const _d = User;

    const contract = await Contract.findById(contractId)
      .populate({ path: "clientId", strictPopulate: false })
      .populate({ path: "unitId", select: "make model plate color year", strictPopulate: false })
      .populate({ path: "deliveryDriverId", select: "name phone", strictPopulate: false })
      .populate({ path: "returnDriverId", select: "name phone", strictPopulate: false })
      .lean() as any;

    if (!contract || !contract.clientId) {
      console.warn(`[ClientNotification] Contract ${contractId} or client not found`);
      return results;
    }

    // Ensure client details are accessible even if populated partially
    let clientDoc = contract.clientId;
    if (!clientDoc.name || !clientDoc.phone) {
      const fullClient = await Client.findById(clientDoc._id || clientDoc).lean() as any;
      if (fullClient) clientDoc = fullClient;
    }

    const clientName = clientDoc.name || "Valued Customer";
    const clientEmail = clientDoc.email;
    const clientPhone = clientDoc.phone;

    const contractNum = contract.contractNumber || contract._id.toString().substring(0, 8).toUpperCase();
    const vehicleName = contract.unitId ? `${contract.unitId.make} ${contract.unitId.model}` : "Vehicle";
    const vehiclePlate = contract.unitId?.plate || "";
    const vehicleColor = contract.unitId?.color || "";
    const vehicleYear = contract.unitId?.year || "";

    const startDate = new Date(contract.startDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const endDate = new Date(contract.endDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const driverName = contract.deliveryDriverId?.name || "Our driver";
    const driverPhone = contract.deliveryDriverId?.phone || "";

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const contractPdfUrl = `${baseUrl}/bookings/${contract._id}/print`;
    const contractDownloadUrl = `${baseUrl}/api/contracts/${contract._id}/pdf`;

    // 0. GENERATE REAL PDF BUFFER FOR ATTACHMENT (Exact match of Admin Print Page /bookings/[id]/print)
    let pdfBuffer: Buffer | undefined;
    try {
      // Timeout PDF generation after 15s so it doesn't block WhatsApp sending
      const pdfPromise = generateContractPdfFromPrintUrl(contract._id.toString(), {
        contractNumber: contractNum,
        clientName,
        clientPhone: clientPhone || "",
        clientEmail: clientEmail || "",
        clientIdNumber: clientDoc.idNumber || clientDoc.passportNumber || "",
        clientLicense: clientDoc.licenseNumber || clientDoc.driverLicense || "",
        vehicleName,
        vehiclePlate,
        vehicleColor,
        vehicleYear,
        checkoutMileage: contract.checkoutMileage || contract.startMileage || 0,
        checkoutFuelLevel: contract.checkoutFuelLevel !== undefined ? Number(contract.checkoutFuelLevel) : 100,
        startDate,
        endDate,
        totalDays: contract.totalDays || 1,
        dailyRate: contract.dailyRate || (contract.totalDays ? Math.round(contract.totalAmount / contract.totalDays) : contract.totalAmount),
        depositAmount: contract.depositAmount || 0,
        totalAmount: contract.totalAmount || 0,
        paymentMethod: contract.paymentMethod || "Cash",
        salikCharge: Number(contract.salikCharge || contract.salikFees || 0),
        parkingCharge: Number(contract.parkingCharge || contract.parkingFees || 0),
        finesCharge: Number(contract.finesCharge || contract.finesFees || 0),
        fuelCharge: Number(contract.fuelCharge || contract.fuelFees || 0),
        notes: contract.notes || "",
        customerSignature: contract.customerSignature || contract.signature,
        createdAt: new Date(contract.createdAt || Date.now()).toLocaleDateString("en-GB"),
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("PDF generation timed out after 15s")), 15000)
      );
      pdfBuffer = await Promise.race([pdfPromise, timeoutPromise]);
      console.log(`[ClientNotification] Generated exact admin print PDF (${pdfBuffer.length} bytes) for contract #${contractNum}`);
    } catch (pdfErr) {
      console.error(`[ClientNotification] Error generating PDF for contract #${contractNum}:`, pdfErr);
      // pdfBuffer stays undefined — WhatsApp will send text only
    }

    // 1. SEND GMAIL TO CLIENT WITH ATTACHED PDF
    if (clientEmail) {
      const transporter = getTransporter();
      if (transporter) {
        try {
          let subject = "";
          let emailHtml = "";

          if (type === "final") {
            subject = `Your Rental Contract #${contractNum} — ${vehicleName} | Leon Car Rental`;

            emailHtml = `
              <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a2e; line-height: 1.7;">
                <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 22px;">Leon Car Rental</h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Contract #${contractNum}</p>
                </div>
                <div style="padding: 30px; background: #ffffff; border: 1px solid #e2e8f0; border-top: 0;">
                  <p style="font-size: 16px; margin: 0 0 16px;">Hello <strong>${clientName}</strong>,</p>
                  <p style="font-size: 14px; margin: 0 0 16px;">Please find your rental contract attached. 📄</p>
                  <p style="font-size: 14px; margin: 0 0 8px;">Thank you for choosing <strong>Leon Car Rental</strong>.</p>
                  <p style="font-size: 14px; margin: 0;">Enjoy the drive & stay safe! 🚗</p>
                </div>
                <div style="padding: 16px 30px; background: #f1f5f9; border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 12px 12px; text-align: center;">
                  <p style="font-size: 12px; color: #94a3b8; margin: 0;">— <strong>Leon Car Rental</strong></p>
                </div>
              </div>
            `;
          } else {
            subject = `Your Rental Contract #${contractNum} | Leon Car Rental`;

            emailHtml = `
              <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a2e; line-height: 1.7;">
                <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 22px;">Leon Car Rental</h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Contract #${contractNum}</p>
                </div>
                <div style="padding: 30px; background: #ffffff; border: 1px solid #e2e8f0; border-top: 0;">
                  <p style="font-size: 16px; margin: 0 0 16px;">Hello <strong>${clientName}</strong>,</p>
                  <p style="font-size: 14px; margin: 0 0 16px;">Please find your rental contract attached. 📄</p>
                  <p style="font-size: 14px; margin: 0 0 8px;">Thank you for choosing <strong>Leon Car Rental</strong>.</p>
                  <p style="font-size: 14px; margin: 0;">Enjoy the drive & stay safe! 🚗</p>
                </div>
                <div style="padding: 16px 30px; background: #f1f5f9; border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 12px 12px; text-align: center;">
                  <p style="font-size: 12px; color: #94a3b8; margin: 0;">— <strong>Leon Car Rental</strong></p>
                </div>
              </div>
            `;
          }

          const attachments = pdfBuffer ? [
            {
              filename: `Contract-${contractNum}.pdf`,
              content: pdfBuffer,
              contentType: "application/pdf",
            }
          ] : [];

          await transporter.sendMail({
            from: `"Leon Rent Car" <${process.env.SMTP_USER}>`,
            to: clientEmail,
            subject,
            html: emailHtml,
            attachments,
          });
          results.email = true;
          console.log(`[ClientNotification] Email with attached PDF sent to ${clientEmail}`);
        } catch (mailErr) {
          console.error(`[ClientNotification] Failed to send email to ${clientEmail}:`, mailErr);
        }
      }
    }

    // 2. SEND WHATSAPP TO CLIENT WITH REAL PDF DOCUMENT
    if (clientPhone) {
      try {
        console.log(`[ClientNotification] ▶ Starting WhatsApp send to: "${clientPhone}", pdfBuffer: ${pdfBuffer ? `${pdfBuffer.length} bytes` : 'NONE'}`);
        let whatsappMsg = "";

        if (type === "final") {
          whatsappMsg = `Hello ${clientName},\nPlease find your rental contract attached. 📄\n\nThank you for choosing Leon Car Rental.\nEnjoy the drive & stay safe!`;
        } else {
          whatsappMsg = `Hello ${clientName},\nPlease find your rental contract attached. 📄\n\nThank you for choosing Leon Car Rental.\nEnjoy the drive & stay safe!`;
        }

        const waRes = await sendWhatsApp({
          to: clientPhone,
          message: whatsappMsg,
          pdfBuffer,
          pdfFilename: `Contract-${contractNum}.pdf`,
          pdfUrl: contract.contractPdfUrl || contractDownloadUrl || contractPdfUrl,
        });

        if (waRes.success) {
          results.whatsapp = true;
          console.log(`[ClientNotification] WhatsApp sent via [${waRes.provider}] to ${clientPhone}`);
        } else {
          console.error(`[ClientNotification] WhatsApp failed for ${clientPhone}:`, waRes.error);
        }
      } catch (waErr) {
        console.error(`[ClientNotification] WhatsApp exception for ${clientPhone}:`, waErr);
      }
    }
  } catch (err) {
    console.error("[ClientNotification] Execution error:", err);
  }


  return results;
}

/**
 * Sends automated WhatsApp + Gmail task notification to Driver
 * Supports types: "delivery_assigned" | "return_assigned"
 */
export async function sendDriverTaskNotification(
  driverId: string,
  contractId: string,
  type: "delivery_assigned" | "return_assigned" = "delivery_assigned"
): Promise<{ email: boolean; whatsapp: boolean }> {
  const results = { email: false, whatsapp: false };

  try {
    await connectDB();

    // Fetch driver details (User or Driver collection)
    let driver: any = await User.findById(driverId);
    if (!driver) {
      driver = await Driver.findById(driverId);
    }
    if (!driver) {
      console.warn(`[DriverNotification] Driver not found: ${driverId}`);
      return results;
    }

    const _c = Client;
    const _u = Unit;
    const contract = await Contract.findById(contractId)
      .populate({ path: "clientId", select: "name phone", strictPopulate: false })
      .populate({ path: "unitId", select: "make model plate", strictPopulate: false })
      .lean() as any;

    if (!contract) {
      console.warn(`[DriverNotification] Contract not found: ${contractId}`);
      return results;
    }

    const contractNum = contract.contractNumber || contract._id.toString().substring(0, 8).toUpperCase();
    const vehicleName = contract.unitId ? `${contract.unitId.make} ${contract.unitId.model}` : "Vehicle";
    const vehiclePlate = contract.unitId?.plate || "";
    const clientName = contract.clientId?.name || "Client";
    const clientPhone = contract.clientId?.phone || "";
    const startDate = new Date(contract.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const endDate = new Date(contract.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    const isDelivery = type === "delivery_assigned";
    const taskArabicTitle = isDelivery 
      ? "🚗 مهمة تسليم سيارة للعميل (Give a Car)" 
      : "🔄 مهمة استلام وإرجاع سيارة (Pick a Car & Return)";
    const taskType = isDelivery ? "Vehicle Delivery" : "Vehicle Return Pickup";
    const location = isDelivery 
      ? (contract.pickupLocation || "Main Office") 
      : (contract.dropoffLocation || contract.pickupLocation || "Location TBD");
    const time = isDelivery ? (contract.checkoutTime || "08:00 AM") : (contract.checkinTime || "10:00 AM");

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const actionUrl = isDelivery 
      ? `${baseUrl}/driver/delivery?contractId=${contract._id}`
      : `${baseUrl}/driver/return?contractId=${contract._id}`;

    // 1. SEND GMAIL TO DRIVER
    if (driver.email) {
      const transporter = getTransporter();
      if (transporter) {
        try {
          const emailHtml = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a2e; line-height: 1.7;">
              <div style="background: ${isDelivery ? '#10b981' : '#2563eb'}; padding: 24px 30px; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 20px;">${taskArabicTitle}</h1>
                <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 14px;">Contract #${contractNum} — ${taskType}</p>
              </div>
              
              <div style="padding: 28px 30px; background: #f8fafc; border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 12px 12px;">
                <p style="font-size: 16px; margin: 0 0 15px;">Hello <strong>${driver.name}</strong>,</p>
                <p style="font-size: 14px; margin-bottom: 20px;">
                  ${isDelivery 
                    ? "لديك طلب جديد لتوصيل وتسليم سيارة للعميل (Give a Car to Client)." 
                    : "لديك طلب جديد لاستلام السيارة من العميل وإرجاعها (Pick up Car & Return it)."}
                </p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 10px 0; color: #64748b; width: 150px;">السيارة / Vehicle</td>
                    <td style="padding: 10px 0; font-weight: 600;">${vehicleName} (${vehiclePlate})</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 10px 0; color: #64748b;">العميل / Client</td>
                    <td style="padding: 10px 0; font-weight: 600;">${clientName}${clientPhone ? ` — <a href="tel:${clientPhone}" style="color: #2563eb; text-decoration: none;">${clientPhone}</a>` : ''}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 10px 0; color: #64748b;">${isDelivery ? 'موقع التسليم / Delivery' : 'موقع الاستلام / Pickup'}</td>
                    <td style="padding: 10px 0; font-weight: 600;">${location}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 10px 0; color: #64748b;">التوقيت / Scheduled Time</td>
                    <td style="padding: 10px 0; font-weight: 600;">${time}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #64748b;">فترة الإيجار / Period</td>
                    <td style="padding: 10px 0; font-weight: 600;">${startDate} → ${endDate}</td>
                  </tr>
                </table>

                ${contract.notes ? `<div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px; margin: 16px 0; font-size: 13px;"><strong>📋 تعليمات وملاحظات / Instructions:</strong><br/>${contract.notes}</div>` : ''}
                
                <div style="margin: 25px 0; text-align: center;">
                  <a href="${actionUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; background: ${isDelivery ? '#10b981' : '#2563eb'}; color: white; text-decoration: none; font-weight: bold; border-radius: 8px; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                    📲 فتح مهمة السائق (${isDelivery ? 'Confirm Handover' : 'Process Return'})
                  </a>
                </div>

                <p style="font-size: 13px; color: #64748b; margin-top: 24px;">Best regards,<br/><strong>Leon Rent Car Dispatch</strong></p>
              </div>
            </div>
          `;

          await transporter.sendMail({
            from: `"Leon Rent Car Dispatch" <${process.env.SMTP_USER}>`,
            to: driver.email,
            subject: `${taskArabicTitle} — #${contractNum} | ${vehicleName}`,
            html: emailHtml,
          });
          results.email = true;
          console.log(`[DriverNotification] Email sent to ${driver.email}`);
        } catch (mailErr) {
          console.error(`[DriverNotification] Failed to send email to ${driver.email}:`, mailErr);
        }
      }
    }

    // 2. SEND WHATSAPP TO DRIVER
    if (driver.phone) {
      try {
        const whatsappMsg = `*${taskArabicTitle}*\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `📄 رقم العقد / Contract: #${contractNum}\n` +
          `🚙 السيارة / Vehicle: ${vehicleName} (${vehiclePlate})\n` +
          `👤 العميل / Client: ${clientName}\n` +
          `📞 هاتف العميل / Phone: ${clientPhone || "N/A"}\n` +
          `📍 ${isDelivery ? 'موقع التسليم / Delivery Location' : 'موقع الاستلام / Pickup Location'}: ${location}\n` +
          `⏰ التوقيت المحدد / Time: ${time}\n` +
          `📅 فترة الإيجار / Period: ${startDate} → ${endDate}\n` +
          (contract.notes ? `\n📋 ملاحظات / Notes: ${contract.notes}\n` : '') +
          `\n📲 رابط المهمة للسائق / Open Task:\n${actionUrl}\n\n` +
          `— Leon Rent Car Dispatch`;

        const waRes = await sendWhatsApp({
          to: driver.phone,
          message: whatsappMsg,
        });

        if (waRes.success) {
          results.whatsapp = true;
          console.log(`[DriverNotification] WhatsApp sent via [${waRes.provider}] to ${driver.phone}`);
        } else {
          console.error(`[DriverNotification] WhatsApp failed for driver ${driver.phone}:`, waRes.error);
        }
      } catch (waErr) {
        console.error(`[DriverNotification] WhatsApp exception for driver ${driver.phone}:`, waErr);
      }
    }
  } catch (err) {
    console.error("[DriverNotification] Execution error:", err);
  }

  return results;
}
