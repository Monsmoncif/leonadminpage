import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Damage, DamageDocument } from './schemas/damage.schema';
import { Contract, ContractDocument } from '../contracts/schemas/contract.schema';
import { Unit, UnitDocument } from '../units/schemas/unit.schema';
import { Log, LogDocument } from '../logs/schemas/log.schema';
import { Notification, NotificationDocument } from '../notifications/schemas/notification.schema';

@Injectable()
export class DamagesService {
  constructor(
    @InjectModel(Damage.name) private damageModel: Model<DamageDocument>,
    @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
    @InjectModel(Unit.name) private unitModel: Model<UnitDocument>,
    @InjectModel(Log.name) private logModel: Model<LogDocument>,
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
  ) {}

  async findAll(driverId?: string) {
    let filter: any = {};
    if (driverId) {
      const driverContracts = await this.contractModel.find({ driverId }).select('_id');
      const contractIds = driverContracts.map((c) => c._id);
      filter = {
        $or: [{ contractId: { $in: contractIds } }, { reportedById: driverId }],
      };
    }

    return this.damageModel
      .find(filter)
      .populate({
        path: 'contractId',
        populate: { path: 'driverId', select: 'name email' },
      })
      .populate('unitId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(id: string) {
    const damage = await this.damageModel.findById(id).populate('unitId contractId').exec();
    if (!damage) {
      throw new NotFoundException('Damage not found');
    }
    return damage;
  }

  async create(body: any, currentUser?: any) {
    const userName = currentUser?.name || 'System';
    const userRole = currentUser?.role || 'admin';
    const userId = currentUser?.id;

    const latest = await this.damageModel.findOne().sort({ createdAt: -1 });
    let newId = 'DMG-1001';
    if (latest && latest.damageId) {
      const match = latest.damageId.match(/\d+/);
      if (match) {
        const num = parseInt(match[0]) + 1;
        newId = `DMG-${num.toString().padStart(4, '0')}`;
      }
    }

    const newDamage = await this.damageModel.create({
      ...body,
      reportedById: userId,
      damageId: newId,
    });

    if (newDamage.status === 'Pending' && newDamage.unitId) {
      await this.unitModel.findByIdAndUpdate(newDamage.unitId, { status: 'Maintenance' });
    }

    try {
      const count = await this.logModel.countDocuments();
      await this.logModel.create({
        logId: `LOG-${(count + 1).toString().padStart(3, '0')}`,
        user: userName,
        role: userRole,
        action: 'Damage Reported',
        description: `Damage ${newId} reported.`,
        type: 'create',
        ip: '127.0.0.1',
      });

      await this.notificationModel.create({
        title: 'Damage Reported',
        message: `New damage ${newId} was reported.`,
        type: 'alert',
      });
    } catch (e) {
      console.error('Failed to log damage creation', e);
    }

    return newDamage;
  }

  async update(id: string, body: any) {
    const damage = await this.damageModel
      .findByIdAndUpdate(id, body, {
        new: true,
        runValidators: true,
      })
      .populate('unitId contractId');

    if (!damage) {
      throw new NotFoundException('Damage not found');
    }

    if (damage.unitId) {
      const unitId = (damage.unitId as any)._id || damage.unitId;
      if (damage.status === 'Pending') {
        await this.unitModel.findByIdAndUpdate(unitId, { status: 'Maintenance' });
      } else if (damage.status === 'Repaired') {
        await this.unitModel.findByIdAndUpdate(unitId, { status: 'Available' });
      }
    }

    if (damage.contractId && body.cost !== undefined) {
      const cId = (damage.contractId as any)._id || damage.contractId;
      const allContractDamages = await this.damageModel.find({ contractId: cId });
      const totalDamageCharge = allContractDamages.reduce(
        (sum, d) => sum + (Number(d.cost) || 0),
        0,
      );
      const targetContract = await this.contractModel.findById(cId);
      if (targetContract) {
        targetContract.damageCharge = totalDamageCharge;
        const totalDays = targetContract.totalDays || 1;
        const dailyRateVal = targetContract.dailyRate || 0;
        targetContract.totalAmount =
          totalDays * dailyRateVal +
          (targetContract.babySeatFees || 0) +
          (targetContract.tintingFees || 0) +
          (targetContract.deliveryCharges || 0) +
          (targetContract.salikFees || 0) +
          (targetContract.cleaningFees || 0) +
          (targetContract.extraKmCharge || 0) +
          totalDamageCharge;
        await targetContract.save();
      }
    }

    return damage;
  }

  async remove(id: string) {
    const damage = await this.damageModel.findByIdAndDelete(id);
    if (!damage) {
      throw new NotFoundException('Damage not found');
    }

    if (damage.status === 'Pending' && damage.unitId) {
      await this.unitModel.findByIdAndUpdate(damage.unitId, { status: 'Available' });
    }

    return { message: 'Damage deleted successfully' };
  }
}
