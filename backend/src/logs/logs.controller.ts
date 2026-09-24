import { Controller, Get, Post, Delete, Body } from '@nestjs/common';
import { LogsService } from './logs.service';

@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  async findAll() {
    return this.logsService.findAll();
  }

  @Post()
  async create(@Body() body: any) {
    return this.logsService.create(body);
  }

  @Delete()
  async clearAll() {
    return this.logsService.clearAll();
  }
}
