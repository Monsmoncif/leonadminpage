import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Client, ClientDocument } from './schemas/client.schema';
import { Contract, ContractDocument } from '../contracts/schemas/contract.schema';

@Injectable()
export class ClientsService {
  constructor(
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
    @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
  ) {}

  async findAll() {
    const clients = await this.clientModel.find().sort({ createdAt: -1 }).lean();
    const activeRentalsCount = await this.contractModel.countDocuments({ status: 'Active' });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      totalCustomers: clients.length,
      newThisMonth: clients.filter((c: any) => new Date(c.createdAt) >= startOfMonth).length,
      activeRentals: activeRentalsCount,
      activeCustomers: clients.filter((c: any) => c.status !== 'Deactivated').length,
    };

    return { clients, stats };
  }

  async findById(id: string): Promise<any> {
    const client = await this.clientModel.findById(id).lean();
    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const contracts = await this.contractModel
      .find({ clientId: id })
      .sort({ createdAt: -1 })
      .populate({ path: 'unitId', select: 'make model plate images' })
      .lean();

    return { ...client, contracts };
  }

  async create(createDto: any) {
    try {
      const client = await this.clientModel.create(createDto);
      return client;
    } catch (error: any) {
      if (error.code === 11000) {
        throw new BadRequestException('Client with this email or ID already exists.');
      }
      throw error;
    }
  }

  async update(id: string, updateDto: any) {
    try {
      const client = await this.clientModel.findByIdAndUpdate(id, updateDto, {
        new: true,
        runValidators: true,
      });
      if (!client) {
        throw new NotFoundException('Client not found');
      }
      return client;
    } catch (error: any) {
      if (error.code === 11000) {
        throw new BadRequestException('Client with this email or ID already exists.');
      }
      throw error;
    }
  }

  async remove(id: string) {
    const client = await this.clientModel.findByIdAndDelete(id);
    if (!client) {
      throw new NotFoundException('Client not found');
    }
    return { message: 'Client deleted successfully' };
  }
}
