import path from "path";
import fs from "fs";

/**
 * Returns Nodemailer inline attachment object for the company logo.
 * Uses optimized logo-email.png (or logo-original.png as fallback).
 */
export function getEmailLogoAttachment(): {
  filename: string;
  path: string;
  cid: string;
  contentType: string;
} | null {
  try {
    const emailLogo = path.join(process.cwd(), "public", "logo-email.png");
    const originalLogo = path.join(process.cwd(), "public", "logo-original.png");

    if (fs.existsSync(emailLogo)) {
      return {
        filename: "logo.png",
        path: emailLogo,
        cid: "leon-logo",
        contentType: "image/png",
      };
    }
    if (fs.existsSync(originalLogo)) {
      return {
        filename: "logo.png",
        path: originalLogo,
        cid: "leon-logo",
        contentType: "image/png",
      };
    }
  } catch (err) {
    console.warn("[EmailTemplates] Could not locate logo attachment:", err);
  }
  return null;
}

interface BaseEmailOptions {
  title?: string;
  subtitle?: string;
  referenceBadge?: string;
  contentHtml: string;
  logoSrc?: string;
}

export function buildBaseEmailLayout({
  title,
  subtitle,
  referenceBadge,
  contentHtml,
  logoSrc = "cid:leon-logo",
}: BaseEmailOptions): string {
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title || "Leon Rent Car"}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; color: #1e293b; line-height: 1.5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f5f7; width: 100%; margin: 0; padding: 32px 12px;">
    <tr>
      <td align="center" style="padding: 0;">
        <!-- Email Container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; width: 100%; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.04);">
          
          <!-- Corporate Header with Logo -->
          <tr>
            <td style="padding: 24px 32px; border-bottom: 1px solid #f1f5f9; background-color: #ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" style="vertical-align: middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align: middle;">
                          <img src="${logoSrc}" alt="Leon Rent Car" height="40" style="height: 40px; max-height: 44px; width: auto; max-width: 170px; object-fit: contain; display: block; border: 0;" />
                        </td>
                      </tr>
                    </table>
                  </td>
                  ${referenceBadge ? `
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 600; color: #475569; background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px; letter-spacing: 0.3px;">
                      ${referenceBadge}
                    </span>
                  </td>
                  ` : ''}
                </tr>
              </table>
            </td>
          </tr>

          ${title ? `
          <!-- Page Title Block -->
          <tr>
            <td style="padding: 28px 32px 0 32px;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.2px;">
                ${title}
              </h1>
              ${subtitle ? `
              <p style="margin: 6px 0 0; font-size: 13px; color: #64748b; line-height: 1.4;">
                ${subtitle}
              </p>
              ` : ''}
            </td>
          </tr>
          ` : ''}

          <!-- Content Body -->
          <tr>
            <td style="padding: ${title ? '20px 32px 32px 32px' : '32px'};">
              ${contentHtml}
            </td>
          </tr>

          <!-- Corporate Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left">
                    <div style="font-weight: 600; color: #334155;">Leon Rent Car</div>
                    <div style="color: #64748b; margin-top: 2px;">Fleet Operations & Customer Support</div>
                    <div style="color: #64748b; margin-top: 2px;">
                      Email: <a href="mailto:${process.env.SMTP_USER || "info@leonrentcar.com"}" style="color: #2563eb; text-decoration: none;">${process.env.SMTP_USER || "info@leonrentcar.com"}</a>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 16px; border-top: 1px solid #e2e8f0; margin-top: 16px; font-size: 11px; color: #94a3b8;">
                    This is an automated operational transmission regarding your vehicle rental service. Please retain this email for your records.<br/>
                    &copy; ${currentYear} Leon Rent Car. All rights reserved.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Clean data summary table row
 */
export function buildDetailRow(label: string, value: string, isLast = false): string {
  return `
    <tr>
      <td style="padding: 10px 14px; font-size: 13px; color: #64748b; width: 38%; border-bottom: ${isLast ? 'none' : '1px solid #f1f5f9'};">
        ${label}
      </td>
      <td style="padding: 10px 14px; font-size: 13px; font-weight: 600; color: #0f172a; border-bottom: ${isLast ? 'none' : '1px solid #f1f5f9'};">
        ${value}
      </td>
    </tr>
  `;
}

/**
 * 1. Client Contract Email (New Booking, Handover, or Final Return)
 */
export interface ClientContractEmailParams {
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  clientIdNumber?: string;
  clientLicense?: string;
  contractNumber: string;
  vehicleName: string;
  vehiclePlate?: string;
  vehicleColor?: string;
  vehicleYear?: string | number;
  checkoutMileage?: number;
  checkoutFuelLevel?: number;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  pickupLocation?: string;
  returnLocation?: string;
  totalDays?: number;
  dailyRate?: number;
  collectionAmount?: number;
  advancePayment?: number;
  depositAmount?: number;
  totalAmount?: number;
  paymentMethod?: string;
  notes?: string;
  type: "created" | "initial" | "final";
  contractUrl?: string;
}

/**
 * 1. Client Contract Email (New Booking, Handover, or Final Return)
 * Full official contract layout with vehicle details, hirer info, handover metrics, and AED financials.
 */
export function buildClientContractEmail(params: ClientContractEmailParams): { subject: string; html: string } {
  const isFinal = params.type === "final";
  const isHandover = params.type === "initial";

  let title = "Official Rental Agreement";
  let subtitle = `Rental Contract #${params.contractNumber} is confirmed and active.`;
  let statusBadge = "Confirmed Booking";

  if (isHandover) {
    title = "Vehicle Handover Confirmation";
    subtitle = `Vehicle has been officially handed over for Contract #${params.contractNumber}.`;
    statusBadge = "Vehicle Delivered (تم التسليم)";
  } else if (isFinal) {
    title = "Vehicle Return Summary";
    subtitle = `Contract #${params.contractNumber} has been inspected, completed and closed.`;
    statusBadge = "Contract Closed (عقد مكتمل)";
  }

  const subject = isFinal
    ? `Vehicle Return Summary — Contract #${params.contractNumber} | Leon Rent Car`
    : isHandover
    ? `Official Handover Agreement #${params.contractNumber} — ${params.vehicleName} | Leon Rent Car`
    : `Rental Agreement Confirmation #${params.contractNumber} — ${params.vehicleName} | Leon Rent Car`;

  const formatAED = (amount?: number) => {
    if (amount === undefined || amount === null || isNaN(amount)) return "AED 0";
    return `AED ${Number(amount).toLocaleString()}`;
  };

  const vehicleDisplay = `${params.vehicleName}${params.vehicleYear ? ` (${params.vehicleYear})` : ""}${params.vehicleColor ? ` - ${params.vehicleColor}` : ""}`;
  const rentalPeriod = `${params.startDate}${params.startTime ? ` at ${params.startTime}` : ""} to ${params.endDate}${params.endTime ? ` at ${params.endTime}` : ""}`;

  const contentHtml = `
    <p style="margin: 0 0 14px; font-size: 15px; color: #1e293b;">
      Dear <strong>${params.clientName}</strong>,
    </p>

    <p style="margin: 0 0 20px; font-size: 13.5px; color: #475569; line-height: 1.6;">
      ${isHandover
        ? "Thank you for choosing <strong>Leon Rent Car</strong>. Your vehicle has been officially handed over and inspected. Below are the verified details and handover metrics of your active rental agreement."
        : isFinal
        ? "Thank you for renting with <strong>Leon Rent Car</strong>. Your vehicle return inspection has been successfully completed. Below is the final summary of your closed contract."
        : "Thank you for choosing <strong>Leon Rent Car</strong>. Your rental reservation has been registered in our system. Below are the details of your rental contract."}
    </p>

    <!-- Status Banner -->
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin: 0 0 22px; display: table; width: 100%; box-sizing: border-box;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="font-size: 13px; font-weight: 700; color: #15803d;">
            &#10003; Status: ${statusBadge}
          </td>
          <td align="right" style="font-size: 12px; font-weight: 600; color: #166534;">
            Agreement #${params.contractNumber}
          </td>
        </tr>
      </table>
    </div>

    <!-- Section 1: Hirer & Customer Information -->
    <div style="margin: 0 0 20px;">
      <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
        1. Hirer Details / معلومات المستأجر
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fafafa; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
        ${buildDetailRow("Client Name", params.clientName)}
        ${params.clientPhone ? buildDetailRow("Phone Number", params.clientPhone) : ""}
        ${params.clientIdNumber ? buildDetailRow("Emirates ID / Passport", params.clientIdNumber) : ""}
        ${params.clientLicense ? buildDetailRow("Driving License", params.clientLicense, true) : ""}
      </table>
    </div>

    <!-- Section 2: Vehicle & Handover Condition -->
    <div style="margin: 0 0 20px;">
      <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
        2. Vehicle & Handover Condition / بيانات المركبة وحالة الاستلام
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fafafa; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
        ${buildDetailRow("Vehicle", vehicleDisplay)}
        ${params.vehiclePlate ? buildDetailRow("Plate Number", params.vehiclePlate) : ""}
        ${params.checkoutMileage !== undefined ? buildDetailRow("Checkout Odometer (عداد الاستلام)", `${params.checkoutMileage.toLocaleString()} KM`) : ""}
        ${params.checkoutFuelLevel !== undefined ? buildDetailRow("Handover Fuel Level (مستوى الوقود)", `${params.checkoutFuelLevel}%`) : ""}
        ${params.pickupLocation ? buildDetailRow("Handover Location", params.pickupLocation, true) : ""}
      </table>
    </div>

    <!-- Section 3: Rental Period & Duration -->
    <div style="margin: 0 0 20px;">
      <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
        3. Rental Period & Schedule / فترة التأجير
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fafafa; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
        ${buildDetailRow("Rental Period", rentalPeriod)}
        ${params.totalDays ? buildDetailRow("Total Duration", `${params.totalDays} Day${params.totalDays > 1 ? "s" : ""}`, true) : ""}
      </table>
    </div>

    <!-- Section 4: Financial Terms & Payment (AED) -->
    <div style="margin: 0 0 22px;">
      <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
        4. Financial Terms & Payment / الشروط المالية والدفع (AED)
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fafafa; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
        ${params.dailyRate !== undefined && params.dailyRate > 0 ? buildDetailRow("Daily Rate", `${formatAED(params.dailyRate)} / day`) : ""}
        ${params.collectionAmount !== undefined && params.collectionAmount > 0 
          ? buildDetailRow("Rental Collection Amount", formatAED(params.collectionAmount))
          : (params.totalAmount !== undefined && params.totalAmount > 0 ? buildDetailRow("Total Rental Amount", formatAED(params.totalAmount)) : "")}
        ${params.advancePayment !== undefined && params.advancePayment > 0 ? buildDetailRow("Advance Paid", formatAED(params.advancePayment)) : ""}
        ${params.depositAmount !== undefined ? buildDetailRow("Security Deposit", formatAED(params.depositAmount)) : ""}
        ${params.paymentMethod ? buildDetailRow("Payment Method", params.paymentMethod, true) : ""}
      </table>
    </div>

    <!-- Official PDF Attachment Notice -->
    <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #0f172a; border-radius: 6px; padding: 14px 16px; margin: 0 0 24px;">
      <p style="margin: 0 0 4px; font-size: 13px; font-weight: 700; color: #0f172a;">
        &#128196; Official Signed Contract Attached (PDF)
      </p>
      <p style="margin: 0; font-size: 12px; color: #475569; line-height: 1.5;">
        The official, legal PDF copy of your rental contract (<strong>Contract-${params.contractNumber}.pdf</strong>) is attached to this email. It contains the complete terms of hire, vehicle handover inspection checklist, and conditions of carriage.
      </p>
    </div>


    <p style="margin: 20px 0 0; font-size: 12.5px; color: #64748b; line-height: 1.6;">
      For 24/7 Roadside Assistance, vehicle inquiries, or contract extension requests, please reach out to our dispatch desk.<br/>
      Safe travels,<br/>
      <strong style="color: #1e293b;">Leon Rent Car Operations Team</strong>
    </p>
  `;

  return {
    subject,
    html: buildBaseEmailLayout({
      title,
      subtitle,
      referenceBadge: `#${params.contractNumber}`,
      contentHtml,
    }),
  };
}

/**
 * 2. Driver Task Assignment Email
 */
export function buildDriverTaskEmail(params: {
  driverName: string;
  contractNumber: string;
  vehicleName: string;
  vehiclePlate?: string;
  clientName: string;
  clientPhone?: string;
  location: string;
  time: string;
  startDate: string;
  endDate: string;
  notes?: string;
  isDelivery: boolean;
  actionUrl: string;
}): { subject: string; html: string } {
  const taskTitle = params.isDelivery ? "Vehicle Delivery Assignment" : "Vehicle Return Collection";
  const taskSubtitle = params.isDelivery
    ? "Vehicle handover task assigned for dispatch"
    : "Vehicle collection and return inspection assigned";

  const subject = `[Dispatch] ${taskTitle} — Contract #${params.contractNumber} (${params.vehicleName})`;

  const rows = [
    buildDetailRow("Task", params.isDelivery ? "Client Delivery / Handover" : "Vehicle Return Collection"),
    buildDetailRow("Contract Number", `#${params.contractNumber}`),
    buildDetailRow("Vehicle", `${params.vehicleName}${params.vehiclePlate ? ` (${params.vehiclePlate})` : ''}`),
    buildDetailRow("Client", `${params.clientName}${params.clientPhone ? ` — ${params.clientPhone}` : ''}`),
    buildDetailRow(params.isDelivery ? "Delivery Location" : "Collection Location", params.location),
    buildDetailRow("Scheduled Time", params.time),
    buildDetailRow("Rental Period", `${params.startDate} to ${params.endDate}`, true),
  ];

  const contentHtml = `
    <p style="margin: 0 0 16px; font-size: 14px; color: #334155;">
      Hello <strong>${params.driverName}</strong>,
    </p>

    <p style="margin: 0 0 20px; font-size: 13px; color: #475569; line-height: 1.6;">
      You have been assigned an operational task for Contract <strong>#${params.contractNumber}</strong>. Please review the schedule and complete the inspection workflow upon arrival.
    </p>

    <!-- Schedule Table -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 20px; background-color: #fafafa; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
      ${rows.join("")}
    </table>

    ${params.notes ? `
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; margin: 0 0 24px; font-size: 12px; color: #334155;">
      <strong style="color: #0f172a;">Dispatch Instructions:</strong><br/>
      <span style="color: #475569;">${params.notes}</span>
    </div>
    ` : ''}

    <div style="text-align: center; margin: 28px 0 16px;">
      <a href="${params.actionUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #0f172a; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; border-radius: 6px; letter-spacing: 0.2px;">
        Open Driver Inspection Portal
      </a>
    </div>

    <p style="margin: 20px 0 0; font-size: 12px; color: #64748b; line-height: 1.5;">
      Ensure all 8-angle vehicle photos, fuel level, and odometer readings are documented before handover.
    </p>
  `;

  return {
    subject,
    html: buildBaseEmailLayout({
      title: taskTitle,
      subtitle: taskSubtitle,
      referenceBadge: `#${params.contractNumber}`,
      contentHtml,
    }),
  };
}

/**
 * 3. Admin Handover Reminder Email (Tomorrow / Today)
 */
export function buildAdminHandoverReminderEmail(params: {
  contractNumber: string;
  vehicleName: string;
  vehiclePlate?: string;
  clientName: string;
  clientPhone?: string;
  startDateFormatted: string;
  endDateFormatted: string;
  checkoutTime: string;
  location: string;
  timingLabel: "Tomorrow" | "Today";
  viewUrl: string;
}): { subject: string; html: string } {
  const isTomorrow = params.timingLabel === "Tomorrow";
  const title = `Handover Scheduled: ${isTomorrow ? "Tomorrow" : "Today"}`;
  const subtitle = `Operational schedule reminder for Contract #${params.contractNumber}`;

  const subject = `[Handover Reminder] ${params.timingLabel}: Contract #${params.contractNumber} — ${params.vehicleName}`;

  const rows = [
    buildDetailRow("Contract Number", `#${params.contractNumber}`),
    buildDetailRow("Vehicle", `${params.vehicleName}${params.vehiclePlate ? ` (${params.vehiclePlate})` : ''}`),
    buildDetailRow("Client", `${params.clientName}${params.clientPhone ? ` (${params.clientPhone})` : ''}`),
    buildDetailRow("Handover Schedule", `${params.startDateFormatted} at ${params.checkoutTime}`),
    buildDetailRow("Return Schedule", params.endDateFormatted),
    buildDetailRow("Location", params.location, true),
  ];

  const contentHtml = `
    <p style="margin: 0 0 16px; font-size: 14px; color: #334155;">
      Operations Team,
    </p>

    <p style="margin: 0 0 20px; font-size: 13px; color: #475569; line-height: 1.6;">
      This is an automated operational reminder for a scheduled vehicle handover <strong>${isTomorrow ? 'tomorrow' : 'today'}</strong>.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 24px; background-color: #fafafa; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
      ${rows.join("")}
    </table>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; margin: 0 0 24px; font-size: 12px; color: #475569;">
      <strong>Operational Checklist:</strong> Verify vehicle readiness, cleaning condition, fuel level, and documentation prior to departure.
    </div>

    <div style="text-align: center; margin: 28px 0 16px;">
      <a href="${params.viewUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #0f172a; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; border-radius: 6px;">
        Open Contract in Management Portal
      </a>
    </div>
  `;

  return {
    subject,
    html: buildBaseEmailLayout({
      title,
      subtitle,
      referenceBadge: params.timingLabel.toUpperCase(),
      contentHtml,
    }),
  };
}

/**
 * 4. Admin Event Notice (Vehicle Handed Over or Returned)
 */
export function buildAdminEventNoticeEmail(params: {
  contractNumber: string;
  vehicleName: string;
  vehiclePlate?: string;
  clientName: string;
  driverName: string;
  isDelivered: boolean;
  collectedAmount?: number;
  paymentMethod?: string;
  depositAmount?: number;
}): { subject: string; html: string } {
  const title = params.isDelivered ? "Vehicle Handover Completed" : "Vehicle Return Processed";
  const subtitle = params.isDelivered
    ? `Vehicle handed over to client for Contract #${params.contractNumber}`
    : `Vehicle collected and returned for Contract #${params.contractNumber}`;

  const subject = `[Status Update] ${title} — Contract #${params.contractNumber} (${params.vehicleName})`;

  const rows = [
    buildDetailRow("Contract Number", `#${params.contractNumber}`),
    buildDetailRow("Vehicle", `${params.vehicleName}${params.vehiclePlate ? ` (${params.vehiclePlate})` : ''}`),
    buildDetailRow("Client", params.clientName),
    buildDetailRow("Driver", params.driverName),
    buildDetailRow("Status", params.isDelivered ? "Handed over to client" : "Returned & inspected"),
  ];

  if (!params.isDelivered && params.collectedAmount !== undefined) {
    rows.push(
      buildDetailRow(
        "Settlement Collected",
        `${params.collectedAmount.toLocaleString()} DZD (${params.paymentMethod || "Cash"})`
      )
    );
  } else if (params.isDelivered && params.depositAmount !== undefined) {
    rows.push(buildDetailRow("Deposit Recorded", `${params.depositAmount.toLocaleString()} DZD`));
  }

  const contentHtml = `
    <p style="margin: 0 0 16px; font-size: 14px; color: #334155;">
      Management Notice,
    </p>

    <p style="margin: 0 0 20px; font-size: 13px; color: #475569; line-height: 1.6;">
      ${params.isDelivered
        ? `Driver <strong>${params.driverName}</strong> has completed the vehicle handover to client <strong>${params.clientName}</strong>.`
        : `Driver <strong>${params.driverName}</strong> has completed the return inspection and vehicle recovery for client <strong>${params.clientName}</strong>.`}
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 20px; background-color: #fafafa; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
      ${rows.join("")}
    </table>

    <p style="margin: 16px 0 0; font-size: 12px; color: #64748b;">
      The contract records and unit status have been updated in the fleet management database.
    </p>
  `;

  return {
    subject,
    html: buildBaseEmailLayout({
      title,
      subtitle,
      referenceBadge: `#${params.contractNumber}`,
      contentHtml,
    }),
  };
}

/**
 * 5. General Security / Password Changed Email
 */
export function buildSecurityNoticeEmail(params: {
  userName: string;
  userEmail: string;
}): { subject: string; html: string } {
  const title = "Security Notice: Password Updated";
  const subtitle = "Account security confirmation";

  const contentHtml = `
    <p style="margin: 0 0 16px; font-size: 14px; color: #334155;">
      Hello <strong>${params.userName}</strong>,
    </p>

    <p style="margin: 0 0 20px; font-size: 13px; color: #475569; line-height: 1.6;">
      This email confirms that the password for your Leon Rent Car account (<strong>${params.userEmail}</strong>) was recently modified.
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px 16px; margin: 0 0 24px; font-size: 12px; color: #475569;">
      If you performed this change, no further action is required. If you did not authorize this update, please contact your fleet system administrator immediately.
    </div>

    <p style="margin: 20px 0 0; font-size: 12px; color: #64748b;">
      Leon Rent Car Security & Operations
    </p>
  `;

  return {
    subject: "Security Notification: Password Updated | Leon Rent Car",
    html: buildBaseEmailLayout({
      title,
      subtitle,
      referenceBadge: "SECURITY",
      contentHtml,
    }),
  };
}
