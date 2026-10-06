import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Contract } from "@/models/Contract";
import { User } from "@/models/User";
import nodemailer from "nodemailer";

import { buildBaseEmailLayout, buildDetailRow } from "@/lib/email-templates";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();

    const activeContracts = await Contract.find({ status: "Active" }).populate("driverId");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return NextResponse.json({ message: "SMTP credentials not configured" }, { status: 400 });
    }

    let emailsSent = 0;

    for (const contract of activeContracts) {
      const driver: any = contract.driverId;
      if (!driver || !driver.email) continue;

      const endDate = new Date(contract.endDate);
      endDate.setHours(0, 0, 0, 0);

      const isDueToday = endDate.getTime() === today.getTime();
      const isOverdue = endDate.getTime() < today.getTime();

      if (isDueToday || isOverdue) {
        const contractNum = contract._id.toString().substring(0, 8).toUpperCase();
        const subject = isOverdue
          ? `[Action Required] Vehicle Return Overdue — Contract #${contractNum} | Leon Rent Car`
          : `[Schedule Notice] Vehicle Return Scheduled Today — Contract #${contractNum} | Leon Rent Car`;

        const title = isOverdue ? "Vehicle Return Overdue" : "Vehicle Return Scheduled Today";
        const subtitle = isOverdue
          ? `The scheduled rental return period for Contract #${contractNum} has passed.`
          : `Operational reminder for Contract #${contractNum} scheduled for return today.`;

        const contentHtml = `
          <p style="margin: 0 0 16px; font-size: 14px; color: #334155;">
            Hello <strong>${driver.name}</strong>,
          </p>

          <p style="margin: 0 0 20px; font-size: 13px; color: #475569; line-height: 1.6;">
            ${isOverdue
              ? `Contract <strong>#${contractNum}</strong> has exceeded its scheduled return date. Please contact the client immediately and initiate the vehicle recovery procedure.`
              : `Contract <strong>#${contractNum}</strong> is scheduled for return inspection today. Please review the return inspection checklist.`}
          </p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 24px; background-color: #fafafa; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
            ${buildDetailRow("Contract Number", `#${contractNum}`)}
            ${buildDetailRow("Scheduled Return", endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }))}
            ${buildDetailRow("Status", isOverdue ? "Overdue" : "Due Today", true)}
          </table>

          <p style="margin: 20px 0 0; font-size: 12px; color: #64748b;">
            Leon Rent Car Dispatch Operations
          </p>
        `;

        const emailHtml = buildBaseEmailLayout({
          title,
          subtitle,
          referenceBadge: isOverdue ? "OVERDUE" : "DUE TODAY",
          contentHtml,
        });

        try {
          await transporter.sendMail({
            from: `"Leon Rent Car Operations" <${process.env.SMTP_USER}>`,
            to: driver.email,
            subject,
            html: emailHtml,
          });
          emailsSent++;
        } catch (err) {
          console.error(`Failed to send email to ${driver.email}`, err);
        }
      }
    }

    return NextResponse.json({ message: `Successfully sent ${emailsSent} notification emails` }, { status: 200 });
  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
