import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDamage {
  damageId: string;
  unitId: mongoose.Types.ObjectId;
  contractId?: mongoose.Types.ObjectId;
  description: string;
  cost: number;
  status: "Pending" | "Repaired";
  photos: string[]; // Cloudinary URLs
  reportedByRole?: string;
  reportedByName?: string;
  reportedById?: mongoose.Types.ObjectId | string;
  reportedDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const damageSchema = new Schema<IDamage>(
  {
    damageId: { type: String, required: true, unique: true },
    unitId: { type: Schema.Types.ObjectId, ref: "Unit", required: true },
    contractId: { type: Schema.Types.ObjectId, ref: "Contract" },
    description: { type: String, required: true },
    cost: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ["Pending", "Repaired"], default: "Pending" },
    photos: [{ type: String }],
    reportedByRole: { type: String },
    reportedByName: { type: String },
    reportedById: { type: Schema.Types.ObjectId, ref: 'User' },
    reportedDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Prevent mongoose from compiling the model multiple times during Next.js hot reload
export const Damage: Model<IDamage> =
  mongoose.models.Damage || mongoose.model<IDamage>("Damage", damageSchema);
