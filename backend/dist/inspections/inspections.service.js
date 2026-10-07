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
exports.InspectionsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const inspection_schema_1 = require("./schemas/inspection.schema");
let InspectionsService = class InspectionsService {
    constructor(inspectionModel) {
        this.inspectionModel = inspectionModel;
    }
    async findAll() {
        return this.inspectionModel
            .find({})
            .populate('contractId')
            .populate('unitId')
            .populate('driverId')
            .sort({ createdAt: -1 })
            .exec();
    }
    async findById(id) {
        const inspection = await this.inspectionModel
            .findById(id)
            .populate('contractId')
            .populate('unitId')
            .populate('driverId')
            .exec();
        if (!inspection) {
            throw new common_1.NotFoundException('Inspection not found');
        }
        return inspection;
    }
    async create(body) {
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
    async update(id, body) {
        const updated = await this.inspectionModel.findByIdAndUpdate(id, body, {
            new: true,
            runValidators: true,
        });
        if (!updated) {
            throw new common_1.NotFoundException('Inspection not found');
        }
        return updated;
    }
    async remove(id) {
        const deleted = await this.inspectionModel.findByIdAndDelete(id);
        if (!deleted) {
            throw new common_1.NotFoundException('Inspection not found');
        }
        return { message: 'Inspection deleted successfully' };
    }
};
exports.InspectionsService = InspectionsService;
exports.InspectionsService = InspectionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(inspection_schema_1.Inspection.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], InspectionsService);
//# sourceMappingURL=inspections.service.js.map