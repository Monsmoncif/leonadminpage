import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILog extends Document {
  logId: string;
  user: string;
  role: string;
  action: string;
  description: string;
  ip: string;
  type: "auth" | "create" | "delete" | "edit" | "other";
  createdAt: Date;
  updatedAt: Date;
}

const logSchema = new Schema<ILog>(
  {
    logId: { type: String, required: true, unique: true },
    user: { type: String, required: true },
    role: { type: String, required: true },
    action: { type: String, required: true },
    description: { type: String, required: true },
    ip: { type: String, default: "127.0.0.1" },
    type: { type: String, enum: ["auth", "create", "delete", "edit", "other"], default: "other" },
  },
  { timestamps: true }
);

// Prevent mongoose from compiling the model multiple times during Next.js hot reload
export const Log: Model<ILog> = mongoose.models.Log || mongoose.model<ILog>("Log", logSchema);
