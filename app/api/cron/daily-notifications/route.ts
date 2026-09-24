import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Contract } from "@/models/Contract";
import { User } from "@/models/User";
import nodemailer from "nodemailer";

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
        const subject = isOverdue ? "Vehicle Return Overdue!" : "Vehicle Return Due Today";
        const messageText = isOverdue
          ? `Hello ${driver.name},\n\nYour contract (${contract._id.toString().substring(0,8).toUpperCase()}) is OVERDUE for return! Please process the vehicle return immediately.\n\nBest regards,\nWheelzie Team`
          : `Hello ${driver.name},\n\nYour contract (${contract._id.toString().substring(0,8).toUpperCase()}) is scheduled to be returned TODAY.\n\nBest regards,\nWheelzie Team`;

        try {
          await transporter.sendMail({
            from: `"Wheelzie Admin" <${process.env.SMTP_USER}>`,
            to: driver.email,
            subject: subject,
            text: messageText,
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
