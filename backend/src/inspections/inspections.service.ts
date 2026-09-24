import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Inspection, InspectionDocument } from './schemas/inspection.schema';

@Injectable()
export class InspectionsService {
  constructor(
    @InjectModel(Inspection.name) private inspectionModel: Model<InspectionDocument>,
  ) {}

  async findAll() {
    return this.inspectionModel
      .find({})
      .populate('contractId')
      .populate('unitId')
      .populate('driverId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(id: string) {
    const inspection = await this.inspectionModel
      .findById(id)
      .populate('contractId')
      .populate('unitId')
      .populate('driverId')
      .exec();

    if (!inspection) {
      throw new NotFoundException('Inspection not found');
    }
    return inspection;
  }

  async create(body: any) {
    const latest = await this.inspectionModel.findOne().sort({ createdAt: -1 });
    let newId = 'INSP-1001';
    if (latest && latest.inspectionId) {
      const match = latest.inspectionId.match(/\d+/);
      if (match) {
        const num = parseInt(match[0]) + 1;
        newId = `INSP-${num.toString().padStart(4, '0')}`;
      }
    }

    return this.inspectionModel.create({
      ...body,
      inspectionId: newId,
    });
  }

  async update(id: string, body: any) {
    const updated = await this.inspectionModel.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      throw new NotFoundException('Inspection not found');
    }
    return updated;
  }

  async remove(id: string) {
    const deleted = await this.inspectionModel.findByIdAndDelete(id);
    if (!deleted) {
      throw new NotFoundException('Inspection not found');
    }
    return { message: 'Inspection deleted successfully' };
  }
}
