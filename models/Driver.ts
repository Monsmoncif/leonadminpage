import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDriver extends Document {
  name: string;
  email: string;
  phone: string;
  driverId: string;
  license: string;
  licenseExpiry: string;
  status: "Active" | "Deactivated";
  documents: string[];
  createdAt: Date;
  updatedAt: Date;
}

const driverSchema = new Schema<IDriver>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    driverId: { type: String, required: true, unique: true },
    license: { type: String, required: true },
    licenseExpiry: { type: String, required: true },
    status: { type: String, enum: ["Active", "Deactivated"], default: "Active" },
    documents: [{ type: String }],
  },
  { timestamps: true }
);

// Prevent mongoose from compiling the model multiple times during Next.js hot reload
export const Driver: Model<IDriver> =
  mongoose.models.Driver || mongoose.model<IDriver>("Driver", driverSchema);
