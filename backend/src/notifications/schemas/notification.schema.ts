import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ default: false })
  read: boolean;

  @Prop({
    type: String,
    enum: ['contract', 'alert', 'reminder', 'general'],
    default: 'general',
  })
  type: 'contract' | 'alert' | 'reminder' | 'general';
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
