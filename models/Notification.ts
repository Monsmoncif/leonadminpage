import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotification extends Document {
  title: string;
  message: string;
  read: boolean;
  type: "contract" | "alert" | "reminder" | "general";
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    type: { type: String, enum: ["contract", "alert", "reminder", "general"], default: "general" },
  },
  { timestamps: true }
);

export const Notification: Model<INotification> = mongoose.models.Notification || mongoose.model<INotification>("Notification", notificationSchema);
