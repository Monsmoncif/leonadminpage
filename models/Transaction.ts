import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITransaction extends Document {
  transactionId: string;
  type: "income" | "expense";
  title: string;
  category: string;
  amount: number;
  status: "completed" | "pending" | "overdue";
  date: Date;
  
  // Optional fields
  clientName?: string;
  carModel?: string;
  rentalPeriod?: string;
  quantity?: number;
  
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    transactionId: { type: String, required: true, unique: true },
    type: { type: String, enum: ["income", "expense"], required: true },
    title: { type: String, required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["completed", "pending", "overdue"], default: "completed" },
    date: { type: Date, required: true },
    
    // Optional fields
    clientName: { type: String },
    carModel: { type: String },
    rentalPeriod: { type: String },
    quantity: { type: Number, default: 1 },
  },
  { timestamps: true }
);

export const Transaction: Model<ITransaction> = mongoose.models.Transaction || mongoose.model<ITransaction>("Transaction", transactionSchema);
