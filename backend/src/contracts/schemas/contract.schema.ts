import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export type ContractDocument = Contract & Document;

@Schema({ timestamps: true })
export class Contract {
  @Prop({ type: Number, unique: true, sparse: true })
  contractNumber?: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true })
  unitId: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: false })
  clientId?: mongoose.Types.ObjectId;

  @Prop({ type: String, enum: ['Delivery', 'Shop'], default: 'Delivery' })
  contractType: 'Delivery' | 'Shop';

  @Prop({ type: String, enum: ['Daily', 'Monthly'], default: 'Daily' })
  rentalType: 'Daily' | 'Monthly';

  @Prop({ type: String, enum: ['B2C', 'B2B'], default: 'B2C' })
  customerType: 'B2C' | 'B2B';

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false })
  driverId?: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false })
  deliveryDriverId?: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false })
  returnDriverId?: mongoose.Types.ObjectId;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ required: true })
  dailyRate: number;

  @Prop({ default: 0 })
  dailyKmLimit: number;

  @Prop({ default: 0 })
  pricePerExtraKm: number;

  @Prop({ required: true })
  totalDays: number;

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ required: true })
  depositAmount: number;

  @Prop({ default: 0 })
  checkoutMileage: number;

  @Prop({ default: 100 })
  checkoutFuelLevel: number;

  @Prop({ default: 0 })
  extraKmCharge: number;

  @Prop({ required: true })
  pickupLocation: string;

  @Prop({ default: '' })
  dropoffLocation: string;

  @Prop({ default: '07:00 AM' })
  checkoutTime: string;

  @Prop({ default: '07:00 AM' })
  checkinTime: string;

  @Prop()
  additionalDriverName?: string;

  @Prop()
  additionalDriverLicense?: string;

  @Prop()
  additionalDriverNationality?: string;

  @Prop()
  additionalDriverPhone?: string;

  @Prop()
  additionalDriverExpiry?: string;

  @Prop()
  additionalDriverIssuedAt?: string;

  @Prop({ default: 0 })
  babySeatFees: number;

  @Prop({ default: 0 })
  tintingFees: number;

  @Prop({ default: 0 })
  deliveryCharges: number;

  @Prop({ default: 0 })
  salikFees: number;

  @Prop({ default: 0 })
  parkingFees: number;

  @Prop({ default: 0 })
  finesFees: number;

  @Prop({ default: 0 })
  fuelFees: number;

  @Prop({ default: 0 })
  salikCharge: number;

  @Prop({ default: 0 })
  parkingCharge: number;

  @Prop({ default: 0 })
  finesCharge: number;

  @Prop({ default: 0 })
  fuelCharge: number;

  @Prop({ default: 0 })
  cleaningFees: number;

  @Prop()
  notes?: string;

  @Prop()
  returnNotes?: string;

  @Prop({ type: String, default: 'Cash' })
  paymentMethod: string;

  @Prop({ type: String, enum: ['Pending', 'Partial', 'Paid'], default: 'Pending' })
  paymentStatus: 'Pending' | 'Partial' | 'Paid';

  @Prop({
    type: String,
    enum: ['Draft', 'Active', 'Completed', 'Cancelled'],
    default: 'Draft',
  })
  status: 'Draft' | 'Active' | 'Completed' | 'Cancelled';

  @Prop({ type: [String], default: [] })
  inspectionPhotos: string[];

  @Prop()
  customerSignature?: string;

  @Prop()
  adminSignature?: string;

  @Prop({ type: Object })
  signatureMetadata?: {
    ipAddress?: string;
    gpsLocation?: string;
    signedAt?: Date;
  };

  @Prop({
    type: String,
    enum: ['Pending', 'Delivered', 'Returned'],
    default: 'Pending',
  })
  deliveryStatus: 'Pending' | 'Delivered' | 'Returned';

  @Prop()
  returnOdometer?: number;

  @Prop()
  returnFuelLevel?: number;

  @Prop({ type: [String], default: [] })
  returnPhotos?: string[];

  @Prop({ type: [String], default: [] })
  damagePhotos?: string[];

  @Prop()
  newDamages?: string;

  @Prop({ default: 0 })
  damageCharge?: number;

  @Prop({ default: 0 })
  returnAmountCollected?: number;

  @Prop({ default: 'Cash' })
  returnPaymentMethod?: string;
}

export const ContractSchema = SchemaFactory.createForClass(Contract);
