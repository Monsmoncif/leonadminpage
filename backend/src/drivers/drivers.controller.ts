import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { DriversService } from './drivers.service';

@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get()
  async findAll() {
    return this.driversService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<any> {
    return this.driversService.findById(id);
  }

  @Post()
  async create(@Body() createDto: any) {
    return this.driversService.create(createDto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: any) {
    return this.driversService.update(id, updateDto);
  }

  @Delete('all')
  async removeAll() {
    return this.driversService.removeAll();
  }

  @Delete()
  async removeAllRoot() {
    return this.driversService.removeAll();
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.driversService.remove(id);
  }
}
