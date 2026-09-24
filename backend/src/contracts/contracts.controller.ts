import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { ContractsService } from './contracts.service';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  async findAll(@Query('driverId') driverId?: string) {
    return this.contractsService.findAll(driverId);
  }

  @Post()
  async create(@Body() body: any, @Req() req: any) {
    return this.contractsService.create(body, req.user);
  }

  @Post('notify-driver')
  async notifyDriver(@Body() body: any) {
    return this.contractsService.notifyDriver(body);
  }

  @Post('notify-admin')
  async notifyAdmin(@Body() body: any) {
    return this.contractsService.notifyAdmin(body);
  }

  @Post('send-client')
  async sendClient(@Body() body: any) {
    return this.contractsService.sendClient(body);
  }

  @Post('send')
  async sendEmail(@Body() body: any) {
    return this.contractsService.sendEmail(body);
  }

  @Post('send-whatsapp')
  async sendWhatsApp(@Body() body: any) {
    return this.contractsService.sendWhatsApp(body);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.contractsService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.contractsService.update(id, body, req.user);
  }

  @Patch(':id')
  async patch(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.contractsService.patch(id, body, req.user);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.contractsService.remove(id);
  }
}
