import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export type InspectionDocument = Inspection & Document;

@Schema({ timestamps: true })
export class Inspection {
  @Prop({ required: true, unique: true })
  inspectionId: string;

  @Prop({
    type: String,
    enum: ['Before Rental', 'After Rental'],
    required: true,
  })
  type: 'Before Rental' | 'After Rental';

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: true })
  contractId: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true })
  unitId: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false })
  driverId?: mongoose.Types.ObjectId;

  @Prop({ required: true, default: Date.now })
  date: Date;

  @Prop({ required: true })
  time: string;

  @Prop({ required: true })
  mileage: number;

  @Prop({ required: true, min: 0, max: 100 })
  fuelLevel: number;

  @Prop({ default: '' })
  damages: string;

  @Prop({ type: [String], default: [] })
  photos: string[];

  @Prop({ type: String, enum: ['Completed', 'Pending'], default: 'Completed' })
  status: 'Completed' | 'Pending';
}

export const InspectionSchema = SchemaFactory.createForClass(Inspection);
