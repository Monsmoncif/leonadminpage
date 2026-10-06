export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { buildSecurityNoticeEmail } from "@/lib/email-templates";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const user = await User.findById(id);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    
    // Check if updating email and if it conflicts
    if (body.email) {
      const existingUser = await User.findOne({ email: body.email, _id: { $ne: id } });
      if (existingUser) {
        return NextResponse.json({ error: "Email already in use by another user" }, { status: 400 });
      }
    }

    const isPasswordChanged = !!body.password;

    if (isPasswordChanged) {
      body.password = await bcrypt.hash(body.password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    
    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // --- SEND EMAIL NOTIFICATION IF PASSWORD WAS CHANGED ---
    if (isPasswordChanged) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || "smtp.gmail.com",
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        // Only attempt to send if credentials are provided in .env
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
          const { subject, html: emailHtml } = buildSecurityNoticeEmail({
            userName: updatedUser.name,
            userEmail: updatedUser.email,
          });

          await transporter.sendMail({
            from: `"Leon Rent Car Operations" <${process.env.SMTP_USER}>`,
            to: updatedUser.email,
            subject,
            html: emailHtml,
          });
          console.log(`Password change confirmation email sent to ${updatedUser.email}`);
        } else {
          console.warn("SMTP credentials not configured in .env. Password change email skipped.");
        }
      } catch (emailError) {
        console.error("Failed to send password change email:", emailError);
        // We don't fail the API request if the email fails
      }
    }

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    
    const deletedUser = await User.findByIdAndDelete(id);
    
    if (!deletedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
