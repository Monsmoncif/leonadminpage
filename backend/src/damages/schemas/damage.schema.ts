import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export type DamageDocument = Damage & Document;

@Schema({ timestamps: true })
export class Damage {
  @Prop({ required: true, unique: true })
  damageId: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true })
  unitId: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Contract' })
  contractId?: mongoose.Types.ObjectId;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, default: 0 })
  cost: number;

  @Prop({ type: String, enum: ['Pending', 'Repaired'], default: 'Pending' })
  status: 'Pending' | 'Repaired';

  @Prop({ type: [String], default: [] })
  photos: string[];

  @Prop()
  reportedByRole?: string;

  @Prop()
  reportedByName?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  reportedById?: mongoose.Types.ObjectId;

  @Prop({ default: Date.now })
  reportedDate: Date;
}

export const DamageSchema = SchemaFactory.createForClass(Damage);
