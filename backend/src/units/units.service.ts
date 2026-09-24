import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Unit, UnitDocument } from './schemas/unit.schema';
import { Contract, ContractDocument } from '../contracts/schemas/contract.schema';

@Injectable()
export class UnitsService {
  constructor(
    @InjectModel(Unit.name) private unitModel: Model<UnitDocument>,
    @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
  ) {}

  async findAll() {
    const units = await this.unitModel.find().sort({ createdAt: -1 }).lean();

    const stats = {
      totalVehicles: units.length,
      availableVehicles: units.filter((u: any) => u.status === 'Available').length,
      rentedVehicles: units.filter((u: any) => u.status === 'Rented').length,
      vehiclesInMaintenance: units.filter((u: any) => u.status === 'Maintenance').length,
    };

    return { units, stats };
  }

  async findById(id: string): Promise<any> {
    const unit = await this.unitModel.findById(id).lean();
    if (!unit) {
      throw new NotFoundException('Vehicle not found');
    }

    const contracts = await this.contractModel
      .find({
        unitId: id,
        status: { $in: ['Completed', 'Active'] },
      })
      .sort({ startDate: 1 })
      .select('startDate endDate checkoutMileage returnOdometer status')
      .lean();

    const mileageHistory: { name: string; km: number; date: any }[] = [];

    for (const contract of contracts as any[]) {
      const startDate = new Date(contract.startDate);
      const startLabel = startDate.toLocaleDateString('en-US', {
        month: 'short',
        year: '2-digit',
      });

      if (contract.checkoutMileage != null) {
        mileageHistory.push({
          name: startLabel,
          km: Number(contract.checkoutMileage),
          date: contract.startDate,
        });
      }

      if (contract.returnOdometer != null && contract.returnOdometer > 0) {
        const endDate = new Date(contract.endDate);
        const endLabel = endDate.toLocaleDateString('en-US', {
          month: 'short',
          year: '2-digit',
        });
        mileageHistory.push({
          name: endLabel,
          km: Number(contract.returnOdometer),
          date: contract.endDate,
        });
      }
    }

    mileageHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const deduped = mileageHistory.reduce((acc: any[], cur) => {
      const existing = acc.find((x) => x.name === cur.name && x.date === cur.date);
      if (existing) {
        if (cur.km > existing.km) existing.km = cur.km;
      } else {
        acc.push({ ...cur });
      }
      return acc;
    }, []);

    const finalHistory =
      deduped.length === 0
        ? [{ name: 'Current', km: (unit as any).mileage || 0 }]
        : deduped;

    return { ...unit, mileageHistory: finalHistory };
  }

  async create(createDto: any) {
    try {
      const unit = await this.unitModel.create(createDto);
      return unit;
    } catch (error: any) {
      if (error.code === 11000) {
        throw new BadRequestException('Vehicle with this plate or VIN already exists.');
      }
      throw error;
    }
  }

  async update(id: string, updateDto: any) {
    try {
      const unit = await this.unitModel.findByIdAndUpdate(id, updateDto, {
        new: true,
        runValidators: true,
      });

      if (!unit) {
        throw new NotFoundException('Vehicle not found');
      }

      // Sync price changes to Active and Draft contracts
      if (
        updateDto.dailyRate !== undefined ||
        updateDto.pricePerExtraKm !== undefined ||
        updateDto.dailyKmLimit !== undefined
      ) {
        const activeContracts = await this.contractModel.find({
          unitId: id,
          status: { $in: ['Active', 'Draft'] },
        });

        for (const contract of activeContracts) {
          if (updateDto.dailyRate !== undefined) contract.dailyRate = Number(updateDto.dailyRate);
          if (updateDto.pricePerExtraKm !== undefined) contract.pricePerExtraKm = Number(updateDto.pricePerExtraKm);
          if (updateDto.dailyKmLimit !== undefined) contract.dailyKmLimit = Number(updateDto.dailyKmLimit);

          contract.totalAmount =
            contract.totalDays * contract.dailyRate +
            (contract.babySeatFees || 0) +
            (contract.tintingFees || 0) +
            (contract.deliveryCharges || 0) +
            (contract.salikFees || 0) +
            (contract.cleaningFees || 0) +
            (contract.extraKmCharge || 0) +
            (contract.damageCharge || 0);

          await contract.save();
        }
      }

      return unit;
    } catch (error: any) {
      if (error.code === 11000) {
        throw new BadRequestException('Vehicle with this plate or VIN already exists.');
      }
      throw error;
    }
  }

  async remove(id: string) {
    const unit = await this.unitModel.findByIdAndDelete(id);
    if (!unit) {
      throw new NotFoundException('Vehicle not found');
    }
    return { message: 'Vehicle deleted successfully' };
  }
}
