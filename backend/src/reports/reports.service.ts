import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Report, ReportDocument } from './schemas/report.schema';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Report.name) private reportModel: Model<ReportDocument>,
  ) {}

  async findAll() {
    return this.reportModel.find({}).sort({ dateGenerated: -1 }).exec();
  }

  async create(body: any) {
    return this.reportModel.create({
      ...body,
      status: 'Generated',
    });
  }
}
