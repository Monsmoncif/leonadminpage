import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DriverDocument = Driver & Document;

@Schema({ timestamps: true })
export class Driver {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true, unique: true })
  driverId: string;

  @Prop({ required: true })
  license: string;

  @Prop({ required: true })
  licenseExpiry: string;

  @Prop({ type: String, enum: ['Active', 'Deactivated'], default: 'Active' })
  status: 'Active' | 'Deactivated';

  @Prop({ type: [String], default: [] })
  documents: string[];
}

export const DriverSchema = SchemaFactory.createForClass(Driver);
