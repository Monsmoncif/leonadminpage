import { Controller, Get, Post, Patch, Body } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll() {
    return this.notificationsService.findAll();
  }

  @Post()
  async create(@Body() body: any) {
    return this.notificationsService.create(body);
  }

  @Patch()
  async markAllAsRead() {
    return this.notificationsService.markAllAsRead();
  }
}
