import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ClientDocument = Client & Document;

@Schema({ timestamps: true })
export class Client {
  @Prop({ required: true })
  name: string;

  @Prop({ required: false, default: 'N/A' })
  phone?: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  nationality: string;

  @Prop({ required: true, unique: true })
  idNumber: string;

  @Prop({ required: true })
  licenseNumber: string;

  @Prop({ required: true })
  licenseExpiry: Date;

  @Prop({ required: true })
  address: string;

  @Prop({ type: String, enum: ['Active', 'Deactivated', 'Blacklisted'], default: 'Active' })
  status: 'Active' | 'Deactivated' | 'Blacklisted';

  @Prop({ type: [String], default: [] })
  documents: string[];
}

export const ClientSchema = SchemaFactory.createForClass(Client);
