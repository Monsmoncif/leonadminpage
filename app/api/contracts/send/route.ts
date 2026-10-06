import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { buildBaseEmailLayout } from "@/lib/email-templates";

export async function POST(req: Request) {
  try {
    const { email, clientName, pdfUrl, contractId } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const contentHtml = `
      <p style="margin: 0 0 16px; font-size: 14px; color: #334155;">
        Dear <strong>${clientName || "Valued Customer"}</strong>,
      </p>
      <p style="margin: 0 0 20px; font-size: 13px; color: #475569; line-height: 1.6;">
        Thank you for choosing Leon Rent Car. Your vehicle rental contract has been generated and confirmed in our system. You may view and download your full documentation using the link below:
      </p>
      <div style="text-align: center; margin: 28px 0 24px;">
        <a href="${pdfUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #0f172a; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; border-radius: 6px; letter-spacing: 0.2px;">
          View & Download Rental Contract
        </a>
      </div>
      <p style="margin: 0 0 12px; font-size: 12px; color: #64748b; line-height: 1.5;">
        Direct access link:<br/>
        <a href="${pdfUrl}" style="color: #2563eb; word-break: break-all; text-decoration: underline;">${pdfUrl}</a>
      </p>
      <p style="margin: 20px 0 0; font-size: 13px; color: #64748b; line-height: 1.5;">
        If you have any questions regarding your contract, please feel free to reach out to our support team.<br/>
        Safe travels,<br/>
        <strong style="color: #334155;">Leon Rent Car Operations</strong>
      </p>
    `;

    const mailOptions = {
      from: `"Leon Rent Car" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Rental Contract #${contractId ? contractId.toString().substring(0, 8).toUpperCase() : ""} | Leon Rent Car`,
      html: buildBaseEmailLayout({
        title: "Rental Agreement Confirmation",
        subtitle: "Official vehicle rental documentation",
        referenceBadge: contractId ? `#${contractId.toString().substring(0, 8).toUpperCase()}` : undefined,
        contentHtml,
      }),
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: "Email sent successfully" });
  } catch (error: any) {
    console.error("Email Sending Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
