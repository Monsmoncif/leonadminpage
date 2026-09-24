import mongoose, { Schema, Document, Model } from "mongoose";

export interface IInspection {
  inspectionId: string;
  type: "Before Rental" | "After Rental";
  contractId: mongoose.Types.ObjectId;
  unitId: mongoose.Types.ObjectId;
  driverId?: mongoose.Types.ObjectId;
  date: Date;
  time: string;
  mileage: number;
  fuelLevel: number; // Store as percentage, e.g., 80
  damages: string;
  photos: string[]; // Cloudinary URLs
  status: "Completed" | "Pending";
  createdAt: Date;
  updatedAt: Date;
}

const inspectionSchema = new Schema<IInspection>(
  {
    inspectionId: { type: String, required: true, unique: true },
    type: { type: String, enum: ["Before Rental", "After Rental"], required: true },
    contractId: { type: Schema.Types.ObjectId, ref: "Contract", required: true },
    unitId: { type: Schema.Types.ObjectId, ref: "Unit", required: true },
    driverId: { type: Schema.Types.ObjectId, ref: "User", required: false },
    date: { type: Date, required: true, default: Date.now },
    time: { type: String, required: true },
    mileage: { type: Number, required: true },
    fuelLevel: { type: Number, required: true, min: 0, max: 100 },
    damages: { type: String, default: "" },
    photos: [{ type: String }],
    status: { type: String, enum: ["Completed", "Pending"], default: "Completed" },
  },
  { timestamps: true }
);

// Prevent mongoose from compiling the model multiple times during Next.js hot reload
export const Inspection: Model<IInspection> =
  mongoose.models.Inspection || mongoose.model<IInspection>("Inspection", inspectionSchema);
