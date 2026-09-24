import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Log, LogDocument } from './schemas/log.schema';

@Injectable()
export class LogsService {
  constructor(
    @InjectModel(Log.name) private logModel: Model<LogDocument>,
  ) {}

  async findAll() {
    return this.logModel.find({}).sort({ createdAt: -1 }).limit(100).exec();
  }

  async create(body: any) {
    const count = await this.logModel.countDocuments();
    body.logId = `LOG-${(count + 1).toString().padStart(3, '0')}`;
    return this.logModel.create(body);
  }

  async clearAll() {
    await this.logModel.deleteMany({});
    return { message: 'All logs cleared successfully' };
  }
}
