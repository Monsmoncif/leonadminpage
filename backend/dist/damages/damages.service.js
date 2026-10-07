"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DamagesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const damage_schema_1 = require("./schemas/damage.schema");
const contract_schema_1 = require("../contracts/schemas/contract.schema");
const unit_schema_1 = require("../units/schemas/unit.schema");
const log_schema_1 = require("../logs/schemas/log.schema");
const notification_schema_1 = require("../notifications/schemas/notification.schema");
let DamagesService = class DamagesService {
    constructor(damageModel, contractModel, unitModel, logModel, notificationModel) {
        this.damageModel = damageModel;
        this.contractModel = contractModel;
        this.unitModel = unitModel;
        this.logModel = logModel;
        this.notificationModel = notificationModel;
    }
    async findAll(driverId) {
        let filter = {};
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
    async findById(id) {
        const damage = await this.damageModel.findById(id).populate('unitId contractId').exec();
        if (!damage) {
            throw new common_1.NotFoundException('Damage not found');
        }
        return damage;
    }
    async create(body, currentUser) {
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
        }
        catch (e) {
            console.error('Failed to log damage creation', e);
        }
        return newDamage;
    }
    async update(id, body) {
        const damage = await this.damageModel
            .findByIdAndUpdate(id, body, {
            new: true,
            runValidators: true,
        })
            .populate('unitId contractId');
        if (!damage) {
            throw new common_1.NotFoundException('Damage not found');
        }
        if (damage.unitId) {
            const unitId = damage.unitId._id || damage.unitId;
            if (damage.status === 'Pending') {
                await this.unitModel.findByIdAndUpdate(unitId, { status: 'Maintenance' });
            }
            else if (damage.status === 'Repaired') {
                await this.unitModel.findByIdAndUpdate(unitId, { status: 'Available' });
            }
        }
        if (damage.contractId && body.cost !== undefined) {
            const cId = damage.contractId._id || damage.contractId;
            const allContractDamages = await this.damageModel.find({ contractId: cId });
            const totalDamageCharge = allContractDamages.reduce((sum, d) => sum + (Number(d.cost) || 0), 0);
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
    async remove(id) {
        const damage = await this.damageModel.findByIdAndDelete(id);
        if (!damage) {
            throw new common_1.NotFoundException('Damage not found');
        }
        if (damage.status === 'Pending' && damage.unitId) {
            await this.unitModel.findByIdAndUpdate(damage.unitId, { status: 'Available' });
        }
        return { message: 'Damage deleted successfully' };
    }
};
exports.DamagesService = DamagesService;
exports.DamagesService = DamagesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(damage_schema_1.Damage.name)),
    __param(1, (0, mongoose_1.InjectModel)(contract_schema_1.Contract.name)),
    __param(2, (0, mongoose_1.InjectModel)(unit_schema_1.Unit.name)),
    __param(3, (0, mongoose_1.InjectModel)(log_schema_1.Log.name)),
    __param(4, (0, mongoose_1.InjectModel)(notification_schema_1.Notification.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], DamagesService);
//# sourceMappingURL=damages.service.js.map