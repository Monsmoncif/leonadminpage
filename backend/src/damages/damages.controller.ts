import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { DamagesService } from './damages.service';

@Controller('damages')
export class DamagesController {
  constructor(private readonly damagesService: DamagesService) {}

  @Get()
  async findAll(@Query('driverId') driverId?: string) {
    return this.damagesService.findAll(driverId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.damagesService.findById(id);
  }

  @Post()
  async create(@Body() body: any, @Req() req: any) {
    return this.damagesService.create(body, req.user);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.damagesService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.damagesService.remove(id);
  }
}
