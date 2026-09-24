export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

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
          await transporter.sendMail({
            from: `"Wheelzie Admin" <${process.env.SMTP_USER}>`,
            to: updatedUser.email,
            subject: "Security Alert: Your Password Was Changed",
            text: `Hello ${updatedUser.name},\n\nThis is a confirmation that the password for your Wheelzie account (${updatedUser.email}) was just changed.\n\nIf you did not authorize this change, please contact an administrator immediately.\n\nBest regards,\nWheelzie Team`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
                <h2 style="color: #1e293b; margin-bottom: 20px;">Security Alert: Password Changed</h2>
                <p style="color: #334155; font-size: 16px; line-height: 1.5;">Hello <strong>${updatedUser.name}</strong>,</p>
                <p style="color: #334155; font-size: 16px; line-height: 1.5;">This is a confirmation that the password for your Wheelzie account (<strong>${updatedUser.email}</strong>) was just changed.</p>
                <p style="color: #334155; font-size: 16px; line-height: 1.5;">If you did not authorize this change, please contact an administrator immediately.</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="color: #64748b; font-size: 14px;">Best regards,<br/>The Wheelzie Team</p>
              </div>
            `,
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
