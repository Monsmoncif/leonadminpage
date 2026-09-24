import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LogDocument = Log & Document;

@Schema({ timestamps: true })
export class Log {
  @Prop({ required: true, unique: true })
  logId: string;

  @Prop({ required: true })
  user: string;

  @Prop({ required: true })
  role: string;

  @Prop({ required: true })
  action: string;

  @Prop({ required: true })
  description: string;

  @Prop({ default: '127.0.0.1' })
  ip: string;

  @Prop({
    type: String,
    enum: ['auth', 'create', 'delete', 'edit', 'other'],
    default: 'other',
  })
  type: 'auth' | 'create' | 'delete' | 'edit' | 'other';
}

export const LogSchema = SchemaFactory.createForClass(Log);
