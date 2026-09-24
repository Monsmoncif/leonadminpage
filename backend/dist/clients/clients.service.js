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
exports.ClientsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const client_schema_1 = require("./schemas/client.schema");
const contract_schema_1 = require("../contracts/schemas/contract.schema");
let ClientsService = class ClientsService {
    constructor(clientModel, contractModel) {
        this.clientModel = clientModel;
        this.contractModel = contractModel;
    }
    async findAll() {
        const clients = await this.clientModel.find().sort({ createdAt: -1 }).lean();
        const activeRentalsCount = await this.contractModel.countDocuments({ status: 'Active' });
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const stats = {
            totalCustomers: clients.length,
            newThisMonth: clients.filter((c) => new Date(c.createdAt) >= startOfMonth).length,
            activeRentals: activeRentalsCount,
            activeCustomers: clients.filter((c) => c.status !== 'Deactivated').length,
        };
        return { clients, stats };
    }
    async findById(id) {
        const client = await this.clientModel.findById(id).lean();
        if (!client) {
            throw new common_1.NotFoundException('Client not found');
        }
        const contracts = await this.contractModel
            .find({ clientId: id })
            .sort({ createdAt: -1 })
            .populate({ path: 'unitId', select: 'make model plate images' })
            .lean();
        return { ...client, contracts };
    }
    async create(createDto) {
        try {
            const client = await this.clientModel.create(createDto);
            return client;
        }
        catch (error) {
            if (error.code === 11000) {
                throw new common_1.BadRequestException('Client with this email or ID already exists.');
            }
            throw error;
        }
    }
    async update(id, updateDto) {
        try {
            const client = await this.clientModel.findByIdAndUpdate(id, updateDto, {
                new: true,
                runValidators: true,
            });
            if (!client) {
                throw new common_1.NotFoundException('Client not found');
            }
            return client;
        }
        catch (error) {
            if (error.code === 11000) {
                throw new common_1.BadRequestException('Client with this email or ID already exists.');
            }
            throw error;
        }
    }
    async remove(id) {
        const client = await this.clientModel.findByIdAndDelete(id);
        if (!client) {
            throw new common_1.NotFoundException('Client not found');
        }
        return { message: 'Client deleted successfully' };
    }
};
exports.ClientsService = ClientsService;
exports.ClientsService = ClientsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(client_schema_1.Client.name)),
    __param(1, (0, mongoose_1.InjectModel)(contract_schema_1.Contract.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], ClientsService);
//# sourceMappingURL=clients.service.js.map