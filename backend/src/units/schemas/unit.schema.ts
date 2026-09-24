import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UnitDocument = Unit & Document;

@Schema({ timestamps: true })
export class Unit {
  @Prop({ required: true })
  make: string;

  @Prop({ required: true })
  model: string;

  @Prop({ required: true })
  year: number;

  @Prop({ required: true, unique: true })
  plate: string;

  @Prop({ required: true, unique: true })
  vin: string;

  @Prop({ required: true })
  color: string;

  @Prop({ required: true, default: 0 })
  mileage: number;

  @Prop({
    type: String,
    enum: ['Available', 'Rented', 'Maintenance', 'Out of Service'],
    default: 'Available',
  })
  status: 'Available' | 'Rented' | 'Maintenance' | 'Out of Service';

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ type: [String], default: [] })
  documents: string[];

  @Prop({ default: 0 })
  dailyRate: number;

  @Prop({ default: 0 })
  dailyKmLimit: number;

  @Prop({ default: 0 })
  pricePerExtraKm: number;

  @Prop({ type: String, enum: ['Automatic', 'Manual'], default: 'Automatic' })
  transmission: 'Automatic' | 'Manual';

  @Prop({ default: 5 })
  capacity: number;

  @Prop({
    type: String,
    enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid'],
    default: 'Petrol',
  })
  fuelType: 'Petrol' | 'Diesel' | 'Electric' | 'Hybrid';

  @Prop({ type: [String], default: [] })
  features: string[];

  @Prop({ default: '' })
  description: string;
}

export const UnitSchema = SchemaFactory.createForClass(Unit);
