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
                      Email: <a href="mailto:ourciahmedmoncif@gmail.com" style="color: #2563eb; text-decoration: none;">ourciahmedmoncif@gmail.com</a>
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
export function buildClientContractEmail(params: {
  clientName: string;
  contractNumber: string;
  vehicleName: string;
  vehiclePlate?: string;
  startDate: string;
  endDate: string;
  pickupLocation?: string;
  dailyRate?: number;
  totalAmount?: number;
  type: "created" | "initial" | "final";
  contractUrl?: string;
}): { subject: string; html: string } {
  const isFinal = params.type === "final";
  const title = isFinal ? "Vehicle Return Summary" : "Rental Agreement Confirmation";
  const subtitle = isFinal
    ? `Contract #${params.contractNumber} has been completed and closed.`
    : `Your vehicle rental agreement #${params.contractNumber} is confirmed.`;

  const subject = isFinal
    ? `Rental Return Summary — Contract #${params.contractNumber} | Leon Rent Car`
    : `Rental Agreement #${params.contractNumber} — ${params.vehicleName} | Leon Rent Car`;

  const rows = [
    buildDetailRow("Contract Number", `#${params.contractNumber}`),
    buildDetailRow("Vehicle", `${params.vehicleName}${params.vehiclePlate ? ` (${params.vehiclePlate})` : ''}`),
    buildDetailRow("Rental Period", `${params.startDate} to ${params.endDate}`),
  ];

  if (params.pickupLocation && !isFinal) {
    rows.push(buildDetailRow("Pickup Location", params.pickupLocation));
  }

  if (params.totalAmount !== undefined && params.totalAmount > 0) {
    rows.push(buildDetailRow("Total Rental Amount", `${params.totalAmount.toLocaleString()} DZD`));
  }

  const contentHtml = `
    <p style="margin: 0 0 16px; font-size: 14px; color: #334155;">
      Dear <strong>${params.clientName}</strong>,
    </p>

    <p style="margin: 0 0 20px; font-size: 13px; color: #475569; line-height: 1.6;">
      ${isFinal
        ? "Thank you for renting with Leon Rent Car. Your vehicle return has been inspected and processed. Below is the summary of your completed rental agreement."
        : "Thank you for choosing Leon Rent Car. Your vehicle rental agreement has been registered in our system. Below are your reservation details."}
    </p>

    <!-- Details Box -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 24px; background-color: #fafafa; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
      ${rows.join("")}
    </table>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px 16px; margin: 0 0 24px;">
      <p style="margin: 0; font-size: 12px; color: #475569; line-height: 1.5;">
        <strong>Document Attached:</strong> A signed, official PDF copy of your rental agreement is attached to this email for your records and vehicle verification.
      </p>
    </div>

    ${params.contractUrl ? `
    <div style="text-align: center; margin: 28px 0 16px;">
      <a href="${params.contractUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #0f172a; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; border-radius: 6px; letter-spacing: 0.2px;">
        View Agreement Online
      </a>
    </div>
    ` : ''}

    <p style="margin: 20px 0 0; font-size: 13px; color: #64748b; line-height: 1.5;">
      If you require assistance or roadside support, please contact our dispatch team.<br/>
      Safe travels,<br/>
      <strong style="color: #334155;">Leon Rent Car Operations</strong>
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
