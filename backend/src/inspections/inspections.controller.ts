import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { InspectionsService } from './inspections.service';

@Controller('inspections')
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  @Get()
  async findAll() {
    return this.inspectionsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.inspectionsService.findById(id);
  }

  @Post()
  async create(@Body() body: any) {
    return this.inspectionsService.create(body);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.inspectionsService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.inspectionsService.remove(id);
  }
}
