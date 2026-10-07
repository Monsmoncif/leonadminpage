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
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const unit_schema_1 = require("../units/schemas/unit.schema");
const client_schema_1 = require("../clients/schemas/client.schema");
const contract_schema_1 = require("../contracts/schemas/contract.schema");
const driver_schema_1 = require("../drivers/schemas/driver.schema");
const damage_schema_1 = require("../damages/schemas/damage.schema");
let DashboardService = class DashboardService {
    constructor(unitModel, clientModel, contractModel, driverModel, damageModel) {
        this.unitModel = unitModel;
        this.clientModel = clientModel;
        this.contractModel = contractModel;
        this.driverModel = driverModel;
        this.damageModel = damageModel;
    }
    async getDashboardData(yearParam) {
        const selectedYear = yearParam ? parseInt(yearParam) : new Date().getFullYear();
        const now = new Date();
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        const [totalUnits, availableUnits, rentedUnits, maintenanceUnits, totalClients, totalDrivers, totalContracts, activeContracts, completedContracts, cancelledContracts, overdueContracts, recentActivity, clientsThisMonth, clientsLastMonth, unitsThisMonth, unitsLastMonth, contractsThisMonth, contractsLastMonth, damagesCount,] = await Promise.all([
            this.unitModel.countDocuments(),
            this.unitModel.countDocuments({ status: 'Available' }),
            this.unitModel.countDocuments({ status: 'Rented' }),
            this.unitModel.countDocuments({ status: 'Maintenance' }),
            this.clientModel.countDocuments(),
            this.driverModel.countDocuments(),
            this.contractModel.countDocuments(),
            this.contractModel.countDocuments({ status: 'Active' }),
            this.contractModel.countDocuments({ status: 'Completed' }),
            this.contractModel.countDocuments({ status: 'Cancelled' }),
            this.contractModel.countDocuments({ status: 'Active', endDate: { $lt: new Date() } }),
            this.contractModel
                .find()
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('clientId', 'name')
                .populate('unitId', 'make model plate')
                .lean(),
            this.clientModel.countDocuments({ createdAt: { $gte: startOfThisMonth } }),
            this.clientModel.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
            this.unitModel.countDocuments({ createdAt: { $gte: startOfThisMonth } }),
            this.unitModel.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
            this.contractModel.countDocuments({ createdAt: { $gte: startOfThisMonth } }),
            this.contractModel.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
            this.damageModel.countDocuments({ status: 'Pending' }),
        ]);
        const revenueThisMonthResult = await this.contractModel.aggregate([
            {
                $match: {
                    $or: [
                        { status: 'Completed', updatedAt: { $gte: startOfThisMonth } },
                        { status: 'Active', startDate: { $gte: startOfThisMonth } },
                    ],
                },
            },
            {
                $group: {
                    _id: null,
                    total: {
                        $sum: {
                            $max: [
                                0,
                                {
                                    $subtract: [
                                        { $ifNull: ['$totalAmount', 0] },
                                        { $ifNull: ['$damageCharge', 0] },
                                    ],
                                },
                            ],
                        },
                    },
                },
            },
        ]);
        const revenueThisMonth = revenueThisMonthResult.length > 0 ? revenueThisMonthResult[0].total : 0;
        const revenueLastMonthResult = await this.contractModel.aggregate([
            {
                $match: {
                    $or: [
                        { status: 'Completed', updatedAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } },
                        { status: 'Active', startDate: { $gte: startOfLastMonth, $lte: endOfLastMonth } },
                    ],
                },
            },
            {
                $group: {
                    _id: null,
                    total: {
                        $sum: {
                            $max: [
                                0,
                                {
                                    $subtract: [
                                        { $ifNull: ['$totalAmount', 0] },
                                        { $ifNull: ['$damageCharge', 0] },
                                    ],
                                },
                            ],
                        },
                    },
                },
            },
        ]);
        const revenueLastMonth = revenueLastMonthResult.length > 0 ? revenueLastMonthResult[0].total : 0;
        const calcChange = (current, previous) => {
            if (previous === 0)
                return current > 0 ? 100 : 0;
            return Number((((current - previous) / previous) * 100).toFixed(1));
        };
        const changes = {
            revenue: calcChange(revenueThisMonth, revenueLastMonth),
            rentals: calcChange(contractsThisMonth, contractsLastMonth),
            customers: calcChange(clientsThisMonth, clientsLastMonth),
            vehicles: calcChange(unitsThisMonth, unitsLastMonth),
        };
        const startOfSelectedYear = new Date(selectedYear, 0, 1);
        const endOfSelectedYear = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
        const contractsPerMonth = await this.contractModel.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfSelectedYear, $lte: endOfSelectedYear },
                },
            },
            {
                $group: {
                    _id: { $month: '$createdAt' },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const rentalsPerMonthData = monthNames.map((month, idx) => {
            const found = contractsPerMonth.find((c) => c._id === idx + 1);
            return { month, rentals: found ? found.count : 0 };
        });
        const revenuePerMonth = await this.contractModel.aggregate([
            { $match: { status: { $in: ['Active', 'Completed'] } } },
            {
                $group: {
                    _id: { $month: '$createdAt' },
                    revenue: {
                        $sum: {
                            $max: [
                                0,
                                {
                                    $subtract: [
                                        { $ifNull: ['$totalAmount', 0] },
                                        { $ifNull: ['$damageCharge', 0] },
                                    ],
                                },
                            ],
                        },
                    },
                },
            },
            { $sort: { _id: 1 } },
        ]);
        const revenueData = monthNames.map((month, idx) => {
            const found = revenuePerMonth.find((r) => r._id === idx + 1);
            return { month, revenue: found ? found.revenue : 0 };
        });
        const mostRented = await this.contractModel.aggregate([
            {
                $group: {
                    _id: '$unitId',
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
            { $limit: 4 },
            {
                $lookup: {
                    from: 'units',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'unit',
                },
            },
            { $unwind: { path: '$unit', preserveNullAndEmptyArrays: true } },
        ]);
        const mostRentedCarsData = mostRented.map((item) => ({
            name: item.unit ? `${item.unit.make} ${item.unit.model}` : 'Unknown Vehicle',
            value: item.count,
        }));
        const upcomingReturnsRaw = await this.contractModel
            .find({ status: 'Active' })
            .sort({ endDate: 1 })
            .limit(4)
            .populate('clientId', 'name')
            .populate('unitId', 'make model plate')
            .lean();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const upcomingReturns = upcomingReturnsRaw.map((contract, idx) => {
            const endDate = new Date(contract.endDate);
            const isToday = endDate >= today && endDate < tomorrow;
            const isTomorrow = endDate >= tomorrow && endDate < new Date(tomorrow.getTime() + 86400000);
            return {
                id: idx + 1,
                customer: contract.clientId?.name || 'Unknown',
                vehicle: contract.unitId
                    ? `${contract.unitId.make} ${contract.unitId.model} (${contract.unitId.plate})`
                    : 'Unknown',
                dueDate: isToday
                    ? 'Today'
                    : isTomorrow
                        ? 'Tomorrow'
                        : endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                dueTime: endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                status: isToday ? 'due-today' : 'upcoming',
            };
        });
        const formattedActivity = recentActivity.map((contract, idx) => {
            const clientName = contract.clientId?.name || 'Unknown';
            const unitInfo = contract.unitId ? `${contract.unitId.make} ${contract.unitId.model}` : '';
            let text = '';
            let type = 'booking';
            switch (contract.status) {
                case 'Active':
                    text = `New contract created for ${clientName}${unitInfo ? ` — ${unitInfo}` : ''}`;
                    type = 'booking';
                    break;
                case 'Completed':
                    text = `Vehicle returned by ${clientName}${unitInfo ? ` — ${unitInfo}` : ''}`;
                    type = 'maintenance';
                    break;
                case 'Cancelled':
                    text = `Contract cancelled for ${clientName}`;
                    type = 'payment';
                    break;
                default:
                    text = `Contract updated for ${clientName}`;
                    type = 'client';
            }
            const createdAt = new Date(contract.createdAt);
            const diffMs = Date.now() - createdAt.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            let time = '';
            if (diffMins < 60)
                time = `${diffMins}m ago`;
            else if (diffMins < 1440)
                time = `${Math.floor(diffMins / 60)}h ago`;
            else
                time = `${Math.floor(diffMins / 1440)}d ago`;
            return { id: idx + 1, text, time, type };
        });
        const vehicleAvailabilityData = [
            { name: 'Available', value: availableUnits, color: '#22C55E' },
            { name: 'Rented', value: rentedUnits, color: '#3B82F6' },
            { name: 'Reserved', value: 0, color: '#F59E0B' },
            { name: 'Maintenance', value: maintenanceUnits, color: '#E53935' },
        ];
        return {
            stats: {
                totalRevenue: `$${revenueThisMonth.toLocaleString()}`,
                activeRentals: String(activeContracts),
                totalCustomers: String(totalClients),
                totalDrivers: String(totalDrivers),
                totalVehicles: String(totalUnits),
                availableVehicles: String(availableUnits),
                rentedVehicles: String(rentedUnits),
                vehiclesInMaintenance: String(maintenanceUnits),
                completedRentals: String(completedContracts),
                overdueRentals: String(overdueContracts),
                totalRentals: String(totalContracts),
                damagesReported: String(damagesCount),
                depositsPending: '$0',
                changes,
            },
            rentalsPerMonthData,
            revenueData,
            vehicleAvailabilityData,
            mostRentedCarsData,
            recentActivity: formattedActivity,
            upcomingReturns,
        };
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(unit_schema_1.Unit.name)),
    __param(1, (0, mongoose_1.InjectModel)(client_schema_1.Client.name)),
    __param(2, (0, mongoose_1.InjectModel)(contract_schema_1.Contract.name)),
    __param(3, (0, mongoose_1.InjectModel)(driver_schema_1.Driver.name)),
    __param(4, (0, mongoose_1.InjectModel)(damage_schema_1.Damage.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map