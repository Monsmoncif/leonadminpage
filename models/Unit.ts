import mongoose, { Schema, Document, Model } from "mongoose";

export interface IVidangeRecord {
  _id?: string;
  mileage: number;
  nextDueMileage: number;
  interval: number;
  date: Date | string;
  oilGrade?: string;
  filterChanged?: boolean;
  cost?: number;
  workshop?: string;
  notes?: string;
  recordedAt?: Date | string;
}

export interface IUnit {
  make: string;
  model: string;
  year: number;
  plate: string;
  vin?: string;
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
  registrationExpiry?: Date | string;
  owner?: string;
  initialMileage?: number;
  oilChangeInterval?: number;
  lastOilChangeMileage?: number;
  lastOilChangeDate?: Date | string;
  lastOilChangeNotes?: string;
  lastOilChangeCost?: number;
  oilFilterChanged?: boolean;
  vidangeHistory?: IVidangeRecord[];
  createdAt: Date;
  updatedAt: Date;
}

const vidangeRecordSchema = new Schema<IVidangeRecord>(
  {
    mileage: { type: Number, required: true },
    nextDueMileage: { type: Number, required: true },
    interval: { type: Number, default: 10000 },
    date: { type: Date, required: true, default: Date.now },
    oilGrade: { type: String, default: "5W-30" },
    filterChanged: { type: Boolean, default: true },
    cost: { type: Number, default: 0 },
    workshop: { type: String, default: "" },
    notes: { type: String, default: "" },
    recordedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const unitSchema = new Schema<IUnit>(
  {
    make: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    plate: { type: String, required: true, unique: true },
    vin: { type: String, required: false, sparse: true },
    color: { type: String, required: true },
    mileage: { type: Number, required: true, default: 0 },
    initialMileage: { type: Number, default: 0 },
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
    registrationExpiry: { type: Date, required: false },
    owner: { type: String, default: "" },
    oilChangeInterval: { type: Number, default: 10000 },
    lastOilChangeMileage: { type: Number, default: 0 },
    lastOilChangeDate: { type: Date, required: false },
    lastOilChangeNotes: { type: String, default: "" },
    lastOilChangeCost: { type: Number, default: 0 },
    oilFilterChanged: { type: Boolean, default: true },
    vidangeHistory: { type: [vidangeRecordSchema], default: [] },
  },
  { timestamps: true }
);

unitSchema.index({ status: 1 });
unitSchema.index({ make: 1, model: 1 });
unitSchema.index({ createdAt: -1 });

if (
  mongoose.models.Unit &&
  (!mongoose.models.Unit.schema.path("vidangeHistory") ||
    !mongoose.models.Unit.schema.path("oilChangeInterval"))
) {
  delete mongoose.models.Unit;
}

export const Unit: Model<IUnit> = mongoose.models.Unit || mongoose.model<IUnit>("Unit", unitSchema);
