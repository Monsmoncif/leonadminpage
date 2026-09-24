import mongoose, { Schema, Document, Model } from "mongoose";

export interface IContract extends Document {
  contractNumber?: number;
  unitId: mongoose.Types.ObjectId;
  clientId?: mongoose.Types.ObjectId;
  contractType: "Delivery" | "Shop";
  rentalType?: "Daily" | "Monthly";
  customerType?: "B2C" | "B2B";
  driverId?: mongoose.Types.ObjectId;
  deliveryDriverId?: mongoose.Types.ObjectId;
  returnDriverId?: mongoose.Types.ObjectId;
  returnDriver?: string;
  startDate: Date;
  endDate: Date;
  dailyRate: number;
  dailyKmLimit: number;
  pricePerExtraKm: number;
  totalDays: number;
  totalAmount: number;
  depositAmount: number;
  checkoutMileage?: number;
  checkoutFuelLevel?: number;
  extraKmCharge?: number;
  pickupLocation: string;
  dropoffLocation?: string;
  checkoutTime: string;
  checkinTime: string;
  additionalDriverName?: string;
  additionalDriverLicense?: string;
  additionalDriverNationality?: string;
  additionalDriverPhone?: string;
  additionalDriverExpiry?: string;
  additionalDriverIssuedAt?: string;
  babySeatFees: number;
  tintingFees: number;
  deliveryCharges: number;
  salikFees: number;
  parkingFees?: number;
  finesFees?: number;
  fuelFees?: number;
  cleaningFees: number;
  notes?: string;
  paymentMethod: string;
  paymentStatus: "Pending" | "Partial" | "Paid";
  status: "Draft" | "Active" | "Completed" | "Cancelled";
  
  // Inspection Data
  inspectionPhotos: string[]; // Cloudinary URLs
  customerSignature: string; // Cloudinary URL or Data URI
  adminSignature?: string; // Cloudinary URL or Data URI
  signatureMetadata: {
    ipAddress: string;
    gpsLocation: string;
    signedAt: Date;
  };
  
  // Delivery tracking
  deliveryStatus: "Pending" | "Delivered" | "Returned";

  // Return Data
  returnOdometer?: number;
  returnFuelLevel?: number;
  returnPhotos?: string[];
  damagePhotos?: string[];
  newDamages?: string;
  damageCharge?: number;
  salikCharge?: number;
  parkingCharge?: number;
  finesCharge?: number;
  fuelCharge?: number;
  returnNotes?: string;
  returnAmountCollected?: number;
  returnPaymentMethod?: string;
  returnCustomerSignature?: string;

  createdAt: Date;
  updatedAt: Date;
}

const contractSchema = new Schema<IContract>(
  {
    contractNumber: { type: Number, unique: true, sparse: true },
    unitId: { type: Schema.Types.ObjectId, ref: "Unit", required: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: false },
    contractType: {
      type: String,
      enum: ["Delivery", "Shop"],
      default: "Delivery"
    },
    rentalType: {
      type: String,
      enum: ["Daily", "Monthly"],
      default: "Daily"
    },
    customerType: {
      type: String,
      enum: ["B2C", "B2B"],
      default: "B2C"
    },
    driverId: { type: Schema.Types.ObjectId, ref: "User", required: false },
    deliveryDriverId: { type: Schema.Types.ObjectId, ref: "User", required: false },
    returnDriverId: { type: Schema.Types.ObjectId, ref: "User", required: false },
    returnDriver: { type: String, required: false },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    dailyRate: { type: Number, required: true },
    dailyKmLimit: { type: Number, default: 0 },
    pricePerExtraKm: { type: Number, default: 0 },
    totalDays: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    depositAmount: { type: Number, required: true },
    checkoutMileage: { type: Number, default: 0 },
    checkoutFuelLevel: { type: Number, default: 100 },
    extraKmCharge: { type: Number, default: 0 },
    pickupLocation: { type: String, required: true },
    dropoffLocation: { type: String, required: false, default: "" },
    checkoutTime: { type: String, default: "07:00 AM" },
    checkinTime: { type: String, default: "07:00 AM" },
    additionalDriverName: { type: String },
    additionalDriverLicense: { type: String },
    additionalDriverNationality: { type: String },
    additionalDriverPhone: { type: String },
    additionalDriverExpiry: { type: String },
    additionalDriverIssuedAt: { type: String },
    babySeatFees: { type: Number, default: 0 },
    tintingFees: { type: Number, default: 0 },
    deliveryCharges: { type: Number, default: 0 },
    salikFees: { type: Number, default: 0 },
    parkingFees: { type: Number, default: 0 },
    finesFees: { type: Number, default: 0 },
    fuelFees: { type: Number, default: 0 },
    cleaningFees: { type: Number, default: 0 },
    notes: { type: String },
    returnNotes: { type: String },
    paymentMethod: {
      type: String,
      default: "Cash"
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Partial", "Paid"],
      default: "Pending"
    },
    status: { 
      type: String, 
      enum: ["Draft", "Active", "Completed", "Cancelled"], 
      default: "Draft" 
    },
    inspectionPhotos: [{ type: String }],
    customerSignature: { type: String },
    adminSignature: { type: String },
    signatureMetadata: {
      ipAddress: { type: String },
      gpsLocation: { type: String },
      signedAt: { type: Date }
    },
    deliveryStatus: {
      type: String,
      enum: ["Pending", "Delivered", "Returned"],
      default: "Pending"
    },
    returnOdometer: { type: Number, required: false },
    returnFuelLevel: { type: Number, required: false },
    returnPhotos: { type: [String], required: false },
    damagePhotos: { type: [String], required: false },
    newDamages: { type: String, required: false },
    damageCharge: { type: Number, required: false, default: 0 },
    salikCharge: { type: Number, required: false, default: 0 },
    parkingCharge: { type: Number, required: false, default: 0 },
    finesCharge: { type: Number, required: false, default: 0 },
    fuelCharge: { type: Number, required: false, default: 0 },
    returnAmountCollected: { type: Number, required: false, default: 0 },
    returnPaymentMethod: { type: String, required: false, default: "Cash" },
    returnCustomerSignature: { type: String, required: false, default: null },
  },
  { timestamps: true }
);

if (mongoose.models.Contract) {
  mongoose.deleteModel("Contract");
}

export const Contract: Model<IContract> = mongoose.models.Contract || mongoose.model<IContract>("Contract", contractSchema);
