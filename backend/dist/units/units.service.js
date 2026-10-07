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
exports.UnitsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const unit_schema_1 = require("./schemas/unit.schema");
const contract_schema_1 = require("../contracts/schemas/contract.schema");
let UnitsService = class UnitsService {
    constructor(unitModel, contractModel) {
        this.unitModel = unitModel;
        this.contractModel = contractModel;
    }
    async findAll() {
        const units = await this.unitModel.find().sort({ createdAt: -1 }).lean();
        const stats = {
            totalVehicles: units.length,
            availableVehicles: units.filter((u) => u.status === 'Available').length,
            rentedVehicles: units.filter((u) => u.status === 'Rented').length,
            vehiclesInMaintenance: units.filter((u) => u.status === 'Maintenance').length,
        };
        return { units, stats };
    }
    async findById(id) {
        const unit = await this.unitModel.findById(id).lean();
        if (!unit) {
            throw new common_1.NotFoundException('Vehicle not found');
        }
        const contracts = await this.contractModel
            .find({
            unitId: id,
            status: { $in: ['Completed', 'Active'] },
        })
            .sort({ startDate: 1 })
            .select('startDate endDate checkoutMileage returnOdometer status')
            .lean();
        const mileageHistory = [];
        for (const contract of contracts) {
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
        const deduped = mileageHistory.reduce((acc, cur) => {
            const existing = acc.find((x) => x.name === cur.name && x.date === cur.date);
            if (existing) {
                if (cur.km > existing.km)
                    existing.km = cur.km;
            }
            else {
                acc.push({ ...cur });
            }
            return acc;
        }, []);
        const finalHistory = deduped.length === 0
            ? [{ name: 'Current', km: unit.mileage || 0 }]
            : deduped;
        return { ...unit, mileageHistory: finalHistory };
    }
    async create(createDto) {
        try {
            const unit = await this.unitModel.create(createDto);
            return unit;
        }
        catch (error) {
            if (error.code === 11000) {
                throw new common_1.BadRequestException('Vehicle with this plate or VIN already exists.');
            }
            throw error;
        }
    }
    async update(id, updateDto) {
        try {
            const unit = await this.unitModel.findByIdAndUpdate(id, updateDto, {
                new: true,
                runValidators: true,
            });
            if (!unit) {
                throw new common_1.NotFoundException('Vehicle not found');
            }
            if (updateDto.dailyRate !== undefined ||
                updateDto.pricePerExtraKm !== undefined ||
                updateDto.dailyKmLimit !== undefined) {
                const activeContracts = await this.contractModel.find({
                    unitId: id,
                    status: { $in: ['Active', 'Draft'] },
                });
                for (const contract of activeContracts) {
                    if (updateDto.dailyRate !== undefined)
                        contract.dailyRate = Number(updateDto.dailyRate);
                    if (updateDto.pricePerExtraKm !== undefined)
                        contract.pricePerExtraKm = Number(updateDto.pricePerExtraKm);
                    if (updateDto.dailyKmLimit !== undefined)
                        contract.dailyKmLimit = Number(updateDto.dailyKmLimit);
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
        }
        catch (error) {
            if (error.code === 11000) {
                throw new common_1.BadRequestException('Vehicle with this plate or VIN already exists.');
            }
            throw error;
        }
    }
    async remove(id) {
        const unit = await this.unitModel.findByIdAndDelete(id);
        if (!unit) {
            throw new common_1.NotFoundException('Vehicle not found');
        }
        return { message: 'Vehicle deleted successfully' };
    }
};
exports.UnitsService = UnitsService;
exports.UnitsService = UnitsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(unit_schema_1.Unit.name)),
    __param(1, (0, mongoose_1.InjectModel)(contract_schema_1.Contract.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], UnitsService);
//# sourceMappingURL=units.service.js.map