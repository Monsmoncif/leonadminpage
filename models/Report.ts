import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReport extends Document {
  name: string;
  type: string;
  startDate?: Date;
  endDate?: Date;
  dateGenerated: Date;
  status: "Generated" | "Pending";
  downloadUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },
    startDate: { type: Date },
    endDate: { type: Date },
    dateGenerated: { type: Date, default: Date.now },
    status: { type: String, enum: ["Generated", "Pending"], default: "Pending" },
    downloadUrl: { type: String },
  },
  { timestamps: true }
);

// Prevent mongoose from compiling the model multiple times during Next.js hot reload
export const Report: Model<IReport> =
  mongoose.models.Report || mongoose.model<IReport>("Report", reportSchema);
