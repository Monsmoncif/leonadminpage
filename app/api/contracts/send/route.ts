import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

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

    const mailOptions = {
      from: `"Wheelzie Rentals" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Your Vehicle Rental Contract - Wheelzie`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
          <h2 style="color: #2F3645;">Hello ${clientName},</h2>
          <p>Thank you for choosing Wheelzie for your rental needs!</p>
          <p>Your vehicle rental contract has been successfully generated and signed.</p>
          
          <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px; text-align: center;">
            <a href="${pdfUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; font-weight: bold; border-radius: 6px;">
              View & Download Your Contract
            </a>
            <p style="margin-top: 15px; font-size: 13px; color: #6c757d;">
              Or copy this link: <br/>
              <a href="${pdfUrl}" style="word-break: break-all; color: #10b981;">${pdfUrl}</a>
            </p>
          </div>
          
          <p>If you have any questions, feel free to reply to this email or contact us.</p>
          <p>Drive safe!<br/><strong>The Wheelzie Team</strong></p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: "Email sent successfully" });
  } catch (error: any) {
    console.error("Email Sending Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
