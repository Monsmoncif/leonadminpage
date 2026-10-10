import connectDB from "@/lib/db";
import { Contract } from "@/models/Contract";
import { Client } from "@/models/Client";
import { Unit } from "@/models/Unit";
import { User } from "@/models/User";
import { Driver } from "@/models/Driver";
import { sendWhatsApp, formatPhoneNumberForWhatsApp } from "@/lib/whatsapp";
import nodemailer from "nodemailer";
import { generateContractPdf, generateContractPdfFromPrintUrl } from "@/lib/pdf-generator";
import {
  buildClientContractEmail,
  buildDriverTaskEmail,
  buildAdminHandoverReminderEmail,
  getEmailLogoAttachment,
} from "@/lib/email-templates";

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

    // 0. GENERATE REAL PDF BUFFER ONLY FOR OFFICIAL HANDOVER (type === "initial")
    // For "created" (booking confirmation) and "final" (VIP return thank you), no PDF is generated or attached as requested.
    let pdfBuffer: Buffer | undefined;
    if (type === "initial") {
      const contractPdfData = {
        contractNumber: contractNum,
        clientName,
        clientPhone: clientPhone || "",
        clientEmail: clientEmail || "",
        clientIdNumber: clientDoc.idNumber || clientDoc.passportNumber || "",
        clientType: clientDoc.clientType || (clientDoc.idNumber ? "Resident" : "Tourist"),
        clientLicense: clientDoc.licenseNumber || clientDoc.driverLicense || "",
        vehicleName,
        vehiclePlate,
        vehicleColor,
        vehicleYear,
        checkoutMileage: contract.checkoutMileage || contract.startMileage || 0,
        checkoutFuelLevel: contract.checkoutFuelLevel !== undefined ? Number(contract.checkoutFuelLevel) : 100,
        startDate,
        endDate,
        status: contract.status,
        deliveryStatus: contract.deliveryStatus,
        returnedAt: contract.returnedAt || contract.updatedAt,
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
      };

      try {
        const pdfPromise = generateContractPdfFromPrintUrl(contract._id.toString(), contractPdfData);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Browser PDF generation timed out after 35s")), 35000)
        );
        pdfBuffer = await Promise.race([pdfPromise, timeoutPromise]);
        console.log(`[ClientNotification] Generated exact admin print PDF (${pdfBuffer.length} bytes) for contract #${contractNum}`);
      } catch (browserErr) {
        console.warn(`[ClientNotification] Browser PDF render failed/timed out for contract #${contractNum}, generating via fallback:`, browserErr);
        try {
          pdfBuffer = await generateContractPdf(contractPdfData);
        } catch (fallbackErr) {
          console.error(`[ClientNotification] Both PDF generation methods failed:`, fallbackErr);
        }
      }
    }

    // 1. SEND GMAIL TO CLIENT
    if (clientEmail) {
      const transporter = getTransporter();
      if (transporter) {
        try {
          const { subject, html: emailHtml } = buildClientContractEmail({
            clientName,
            clientPhone: clientPhone || "",
            clientEmail: clientEmail || "",
            clientIdNumber: clientDoc.idNumber || clientDoc.passportNumber || "",
            clientLicense: clientDoc.licenseNumber || clientDoc.driverLicense || "",
            contractNumber: contractNum,
            vehicleName,
            vehiclePlate,
            vehicleColor,
            vehicleYear,
            checkoutMileage: contract.checkoutMileage || contract.startMileage,
            checkoutFuelLevel: contract.checkoutFuelLevel !== undefined ? Number(contract.checkoutFuelLevel) : undefined,
            startDate,
            endDate,
            startTime: contract.checkoutTime || contract.startTime,
            endTime: contract.returnTime || contract.endTime,
            pickupLocation: contract.pickupLocation,
            returnLocation: contract.returnLocation,
            totalDays: contract.totalDays,
            dailyRate: contract.dailyRate,
            collectionAmount: contract.collectionAmount || contract.totalAmount,
            advancePayment: contract.advancePayment || contract.advance,
            depositAmount: contract.depositAmount,
            totalAmount: contract.totalAmount,
            paymentMethod: contract.paymentMethod,
            notes: contract.notes,
            type,
            contractUrl: contractPdfUrl,
          });

          const attachments: any[] = [];
          const logoAtt = getEmailLogoAttachment();
          if (logoAtt) attachments.push(logoAtt);
          if (pdfBuffer && type === "initial") {
            attachments.push({
              filename: `Contract-${contractNum}.pdf`,
              content: pdfBuffer,
              contentType: "application/pdf",
            });
          }

          await transporter.sendMail({
            from: `"Leon Rent Car" <${process.env.SMTP_USER}>`,
            to: clientEmail,
            subject,
            html: emailHtml,
            attachments,
          });
          results.email = true;
          console.log(`[ClientNotification] Email (${type}) sent to ${clientEmail}`);
        } catch (mailErr) {
          console.error(`[ClientNotification] Failed to send email to ${clientEmail}:`, mailErr);
        }
      }
    }

    // 2. SEND WHATSAPP TO CLIENT
    if (clientPhone) {
      try {
        console.log(`[ClientNotification] ▶ Starting WhatsApp send (${type}) to: "${clientPhone}"`);
        let whatsappMsg = "";

        if (type === "final") {
          whatsappMsg = `🌟 *LEON RENT CAR* | شكراً لثقتكم بنا ✨\n` +
            `*Thank You for Choosing Leon Rent Car!*\n\n` +
            `Hello *${clientName}*,\n` +
            `Thank you for renting with Leon Rent Car! It was a pleasure serving you, and we hope you had a wonderful driving journey.\n\n` +
            `📄 *Contract / رقم العقد:* #${contractNum}\n` +
            `🚗 *Vehicle / السيارة:* ${vehicleName}\n` +
            `📅 *Rental Period / الفترة:* ${startDate} ➔ ${endDate}\n\n` +
            `We look forward to welcoming you behind the wheel again very soon!\n` +
            `Safe travels,\n` +
            `— *Leon Rent Car Team*`;
        } else if (type === "created") {
          whatsappMsg = `🎉 *LEON RENT CAR* | تأكيد حجز سيارة\n` +
            `*Vehicle Reservation Confirmed*\n\n` +
            `Hello *${clientName}*,\n` +
            `Your vehicle reservation has been successfully confirmed and registered! ✨\n\n` +
            `🚙 *Vehicle / السيارة:* ${vehicleName}\n` +
            `📅 *Rental Period / الفترة:* ${startDate} ➔ ${endDate}\n` +
            (contract.pickupLocation ? `📍 *Pickup Location / موقع الاستلام:* ${contract.pickupLocation}\n` : '') +
            (contract.checkoutTime ? `⏰ *Pickup Time / موعد الاستلام:* ${contract.checkoutTime}\n` : '') +
            `\n🛡️ *Your vehicle is confirmed and is being prepared for you.* Our team will have it ready on time.\n\n` +
            `Need any assistance? Reply directly to this chat.\n` +
            `— *Leon Rent Car*`;
        } else {
          whatsappMsg = `🌟 *LEON RENT CAR* | عقد إيجار سيارة رسمي\n` +
            `*Vehicle Rental Agreement & Handover*\n\n` +
            `Hello *${clientName}*,\n` +
            `Thank you for choosing Leon Rent Car! Your vehicle handover inspection is complete.\n\n` +
            `📄 *Contract / رقم العقد:* #${contractNum}\n` +
            `🚗 *Vehicle / السيارة:* ${vehicleName}\n` +
            `📅 *Rental Period / الفترة:* ${startDate} ➔ ${endDate}\n` +
            (contract.pickupLocation ? `📍 *Pickup Location / موقع الاستلام:* ${contract.pickupLocation}\n` : '') +
            `\n📎 *Your official rental contract is attached below (PDF).*\n\n` +
            `🛣️ Have a safe journey and enjoy the drive!\n` +
            `— *Leon Rent Car*`;
        }

        const waRes = await sendWhatsApp({
          to: clientPhone,
          message: whatsappMsg,
          pdfBuffer: type === "initial" ? pdfBuffer : undefined,
          pdfFilename: type === "initial" ? `Contract-${contractNum}.pdf` : undefined,
          pdfUrl: type === "initial" ? (contract.contractPdfUrl || contractDownloadUrl || contractPdfUrl) : undefined,
        });

        if (waRes.success) {
          results.whatsapp = true;
          console.log(`[ClientNotification] WhatsApp (${type}) sent via [${waRes.provider}] to ${clientPhone}`);
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
          const { subject, html: emailHtml } = buildDriverTaskEmail({
            driverName: driver.name,
            contractNumber: contractNum,
            vehicleName,
            vehiclePlate,
            clientName,
            clientPhone,
            location,
            time,
            startDate,
            endDate,
            notes: contract.notes,
            isDelivery,
            actionUrl,
          });

          const logoAtt = getEmailLogoAttachment();
          await transporter.sendMail({
            from: `"Leon Rent Car Dispatch" <${process.env.SMTP_USER}>`,
            to: driver.email,
            subject,
            html: emailHtml,
            attachments: logoAtt ? [logoAtt] : [],
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
        const cleanClientPhone = clientPhone ? formatPhoneNumberForWhatsApp(clientPhone) : "";
        const clientChatLink = cleanClientPhone ? `https://wa.me/${cleanClientPhone}` : null;

        const whatsappMsg = `*${taskArabicTitle}*\n\n` +
          `📄 *رقم العقد / Contract:* #${contractNum}\n` +
          `🚙 *السيارة / Vehicle:* ${vehicleName} (${vehiclePlate})\n` +
          `👤 *العميل / Client:* ${clientName}\n` +
          `📞 *هاتف العميل / Phone:* ${clientPhone || "N/A"}\n` +
          (clientChatLink ? `💬 *واتساب العميل / Chat:* ${clientChatLink}\n` : '') +
          `📍 *${isDelivery ? 'موقع التسليم / Delivery' : 'موقع الاستلام / Pickup'}:* ${location}\n` +
          `⏰ *التوقيت المحدد / Time:* ${time}\n` +
          `📅 *فترة الإيجار / Period:* ${startDate} → ${endDate}\n` +
          (contract.notes ? `\n📋 *ملاحظات / Notes:* ${contract.notes}\n` : '') +
          `\n📲 *رابط المهمة للسائق / Open Task:*\n${actionUrl}\n\n` +
          `— *Leon Rent Car Dispatch*`;

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

/**
 * Sends automated Handover Reminder via Gmail + WhatsApp to Admin
 * Triggered 1 day before contract start date (or when scheduled for tomorrow/today)
 */
export async function sendHandoverReminderNotification(
  contractId: string,
  timingLabel: "Tomorrow" | "Today" = "Tomorrow"
): Promise<{ email: boolean; whatsapp: boolean }> {
  const results = { email: false, whatsapp: false };

  try {
    await connectDB();

    const _c = Client;
    const _u = Unit;
    const _usr = User;

    const contract = await Contract.findById(contractId)
      .populate({ path: "clientId", strictPopulate: false })
      .populate({ path: "unitId", select: "make model plate color year", strictPopulate: false })
      .populate({ path: "deliveryDriverId", select: "name phone", strictPopulate: false })
      .lean() as any;

    if (!contract) {
      console.warn(`[HandoverReminder] Contract ${contractId} not found`);
      return results;
    }

    let clientDoc = contract.clientId;
    if (clientDoc && (!clientDoc.name || !clientDoc.phone)) {
      const fullClient = await Client.findById(clientDoc._id || clientDoc).lean() as any;
      if (fullClient) clientDoc = fullClient;
    }

    const clientName = clientDoc?.name || (contract as any).additionalDriverName || "Client";
    const clientPhone = clientDoc?.phone || (contract as any).additionalDriverPhone || "";
    const contractNum = contract.contractNumber ? String(contract.contractNumber) : "";

    const vehicleName = contract.unitId ? `${contract.unitId.make} ${contract.unitId.model}` : "Vehicle";
    const vehiclePlate = contract.unitId?.plate || "";
    const location = contract.pickupLocation || "Main Office";
    const checkoutTime = contract.checkoutTime || "08:00 AM";

    const startDateFormatted = new Date(contract.startDate).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const endDateFormatted = new Date(contract.endDate).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const isTomorrow = timingLabel === "Tomorrow";
    const timingArabic = isTomorrow ? "غداً" : "اليوم";
    const timingBadgeText = isTomorrow ? "Starts Tomorrow (غداً)" : "Starts Today (اليوم)";

    // 1. SEND GMAIL TO ADMIN
    const transporter = getTransporter();
    if (transporter && process.env.SMTP_USER) {
      try {
        const adminUsers = await User.find({ role: "admin" }).select("email").lean();
        const recipientSet = new Set<string>();
        if (process.env.SMTP_USER) recipientSet.add(process.env.SMTP_USER.trim());
        adminUsers.forEach((a: any) => {
          if (a.email && a.email.includes("@")) recipientSet.add(a.email.trim());
        });

        const recipients = Array.from(recipientSet);

        const { subject, html: emailHtml } = buildAdminHandoverReminderEmail({
          contractNumber: contractNum,
          vehicleName,
          vehiclePlate,
          clientName,
          clientPhone,
          startDateFormatted,
          endDateFormatted,
          checkoutTime,
          location,
          timingLabel,
          viewUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/bookings`,
        });

        const logoAtt = getEmailLogoAttachment();
        await transporter.sendMail({
          from: `"Leon Rent Car Dispatch" <${process.env.SMTP_USER}>`,
          to: recipients.join(", "),
          subject,
          html: emailHtml,
          attachments: logoAtt ? [logoAtt] : [],
        });

        results.email = true;
        console.log(`[HandoverReminder] Gmail sent to ${recipients.join(", ")}`);
      } catch (mailErr) {
        console.error("[HandoverReminder] Failed to send Gmail reminder:", mailErr);
      }
    }

    // 2. SEND WHATSAPP TO ADMIN
    try {
      const adminUsers = await User.find({ role: "admin", phone: { $exists: true, $ne: "" } })
        .select("phone name")
        .lean();

      const phoneSet = new Set<string>();
      adminUsers.forEach((a: any) => {
        if (a.phone) phoneSet.add(a.phone.trim());
      });

      const clientChatLink = clientPhone ? `https://wa.me/${formatPhoneNumberForWhatsApp(clientPhone)}` : null;

      const whatsappMsg = `⏰ *تذكير بموعد تسليم سيارة ${timingArabic} / Handover Reminder (${timingLabel})*\n\n` +
        `👤 *العميل / Client:* ${clientName}\n` +
        `🚙 *السيارة / Vehicle:* ${vehicleName}${vehiclePlate ? ` (${vehiclePlate})` : ''}\n` +
        (contractNum ? `📄 *رقم العقد / Contract:* #${contractNum}\n` : '') +
        `📞 *هاتف العميل / Phone:* ${clientPhone || "N/A"}\n` +
        (clientChatLink ? `💬 *مراسلة العميل:* ${clientChatLink}\n` : '') +
        `📅 *تاريخ التسليم / Start:* ${startDateFormatted} — ${checkoutTime}\n` +
        `📍 *الموقع / Location:* ${location}\n\n` +
        `⚠️ *تنبيه:* يرجى التأكد من جاهزية السيارة ونظافتها قبل الموعد.\n\n` +
        `— *Leon Rent Car Dispatch*`;

      for (const rawPhone of Array.from(phoneSet)) {
        const cleanPhone = formatPhoneNumberForWhatsApp(rawPhone);
        if (cleanPhone) {
          const waRes = await sendWhatsApp({
            to: cleanPhone,
            message: whatsappMsg,
          });

          if (waRes.success) {
            results.whatsapp = true;
            console.log(`[HandoverReminder] WhatsApp sent to ${cleanPhone}`);
          } else {
            console.error(`[HandoverReminder] WhatsApp failed for ${cleanPhone}:`, waRes.error);
          }
        }
      }
    } catch (waErr) {
      console.error("[HandoverReminder] WhatsApp exception:", waErr);
    }
  } catch (err) {
    console.error("[HandoverReminder] Execution error:", err);
  }

  return results;
}
