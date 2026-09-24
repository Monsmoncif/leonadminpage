import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUnit {
  make: string;
  model: string;
  year: number;
  plate: string;
  vin: string;
  color: string;
  mileage: number;
  status: "Available" | "Rented" | "Maintenance" | "Out of Service";
  images: string[];
  documents: string[]; // URLs to registration, insurance etc.
  dailyRate: number;
  dailyKmLimit: number; // Daily kilometer allowance, 0 for unlimited
  pricePerExtraKm: number; // Cost per extra kilometer
  transmission: "Automatic" | "Manual";
  capacity: number;
  fuelType: "Petrol" | "Diesel" | "Electric" | "Hybrid";
  features: string[];
  description: string;
  insuranceExpiry?: Date | string;
  createdAt: Date;
  updatedAt: Date;
}

const unitSchema = new Schema<IUnit>(
  {
    make: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    plate: { type: String, required: true, unique: true },
    vin: { type: String, required: true, unique: true },
    color: { type: String, required: true },
    mileage: { type: Number, required: true, default: 0 },
    status: { 
      type: String, 
      enum: ["Available", "Rented", "Maintenance", "Out of Service"],
      default: "Available"
    },
    images: [{ type: String }],
    documents: [{ type: String }],
    dailyRate: { type: Number, default: 0 },
    dailyKmLimit: { type: Number, default: 0 }, // 0 means unlimited
    pricePerExtraKm: { type: Number, default: 0 },
    transmission: { type: String, enum: ["Automatic", "Manual"], default: "Automatic" },
    capacity: { type: Number, default: 5 },
    fuelType: { type: String, enum: ["Petrol", "Diesel", "Electric", "Hybrid"], default: "Petrol" },
    features: [{ type: String }],
    description: { type: String, default: "" },
    insuranceExpiry: { type: Date, required: false },
  },
  { timestamps: true }
);

export const Unit: Model<IUnit> = mongoose.models.Unit || mongoose.model<IUnit>("Unit", unitSchema);
