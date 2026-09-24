import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
  ) {}

  async findAll() {
    return this.notificationModel.find({}).sort({ createdAt: -1 }).exec();
  }

  async create(body: any) {
    return this.notificationModel.create(body);
  }

  async markAllAsRead() {
    await this.notificationModel.updateMany({ read: false }, { $set: { read: true } });
    return { message: 'All notifications marked as read' };
  }
}
