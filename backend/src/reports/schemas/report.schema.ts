import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ReportDocument = Report & Document;

@Schema({ timestamps: true })
export class Report {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  type: string;

  @Prop()
  startDate?: Date;

  @Prop()
  endDate?: Date;

  @Prop({ default: Date.now })
  dateGenerated: Date;

  @Prop({ type: String, enum: ['Generated', 'Pending'], default: 'Pending' })
  status: 'Generated' | 'Pending';

  @Prop()
  downloadUrl?: string;
}

export const ReportSchema = SchemaFactory.createForClass(Report);
