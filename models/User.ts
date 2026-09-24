import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  role: "admin" | "driver";
  status: "active" | "inactive";
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    password: { type: String, select: false },
    role: { type: String, enum: ["admin", "driver"], default: "driver" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    avatarUrl: { type: String },
  },
  { timestamps: true }
);

// Prevent mongoose from compiling the model multiple times during Next.js hot reload
export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", userSchema);

