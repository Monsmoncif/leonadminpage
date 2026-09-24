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
exports.DriversService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const bcrypt = require("bcryptjs");
const driver_schema_1 = require("./schemas/driver.schema");
const contract_schema_1 = require("../contracts/schemas/contract.schema");
const user_schema_1 = require("../users/schemas/user.schema");
let DriversService = class DriversService {
    constructor(driverModel, contractModel, userModel) {
        this.driverModel = driverModel;
        this.contractModel = contractModel;
        this.userModel = userModel;
    }
    async findAll() {
        const drivers = await this.driverModel.find({}).sort({ createdAt: -1 }).lean();
        const allContracts = await this.contractModel.find({}).select('driverId deliveryDriverId returnDriverId status').lean();
        const allUsers = await this.userModel.find({ role: 'driver' }).select('_id name email phone status createdAt').lean();
        const emailToUserId = allUsers.reduce((acc, user) => {
            if (user.email)
                acc[user.email.toLowerCase()] = String(user._id);
            return acc;
        }, {});
        const processedEmails = new Set();
        const driversWithStats = drivers.map((driver) => {
            const emailLower = driver.email?.toLowerCase();
            const userId = emailToUserId[emailLower];
            if (emailLower)
                processedEmails.add(emailLower);
            const driverIdStr = userId || String(driver._id);
            const driverContracts = allContracts.filter((c) => String(c.driverId) === driverIdStr ||
                String(c.deliveryDriverId) === driverIdStr ||
                String(c.returnDriverId) === driverIdStr ||
                String(c.driverId) === String(driver._id));
            return {
                ...driver,
                _id: userId || String(driver._id),
                driverModelId: String(driver._id),
                userId: userId || String(driver._id),
                completedContracts: driverContracts.filter((c) => c.status === 'Completed').length,
                activeRentals: driverContracts.filter((c) => c.status === 'Active').length,
            };
        });
        for (const u of allUsers) {
            const emailLower = u.email?.toLowerCase();
            if (emailLower && !processedEmails.has(emailLower)) {
                processedEmails.add(emailLower);
                const userIdStr = String(u._id);
                const driverContracts = allContracts.filter((c) => String(c.driverId) === userIdStr ||
                    String(c.deliveryDriverId) === userIdStr ||
                    String(c.returnDriverId) === userIdStr);
                driversWithStats.push({
                    _id: userIdStr,
                    userId: userIdStr,
                    name: u.name || 'Driver',
                    email: u.email,
                    phone: u.phone || '+213657878987',
                    driverId: `DRV-${userIdStr.substring(18, 24).toUpperCase()}`,
                    license: 'Standard',
                    licenseExpiry: '2028-12-31',
                    status: u.status === 'inactive' ? 'Deactivated' : 'Active',
                    completedContracts: driverContracts.filter((c) => c.status === 'Completed').length,
                    activeRentals: driverContracts.filter((c) => c.status === 'Active').length,
                    createdAt: u.createdAt,
                });
            }
        }
        const stats = {
            totalDrivers: driversWithStats.length,
            activeNow: driversWithStats.filter((d) => d.status === 'Active').length,
            contractsCreated: allContracts.length,
            avgPerformance: 0,
        };
        return { drivers: driversWithStats, stats };
    }
    async findById(id) {
        let driver = null;
        let user = null;
        if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
            driver = await this.driverModel.findById(id).lean();
            if (!driver) {
                user = await this.userModel.findById(id).lean();
                if (user) {
                    driver = await this.driverModel.findOne({ email: user.email }).lean();
                }
            }
        }
        else {
            driver = await this.driverModel.findOne({ $or: [{ driverId: id }, { email: id }] }).lean();
            if (!driver) {
                user = await this.userModel.findOne({ $or: [{ email: id }, { phone: id }] }).lean();
                if (user) {
                    driver = await this.driverModel.findOne({ email: user.email }).lean();
                }
            }
        }
        if (!driver && !user) {
            throw new common_1.NotFoundException('Driver not found');
        }
        const email = driver?.email || user?.email;
        if (!user && email) {
            user = await this.userModel.findOne({ email }).lean();
        }
        let completedContracts = 0;
        const driverIdStr = user?._id || driver?._id;
        if (driverIdStr) {
            completedContracts = await this.contractModel.countDocuments({
                $or: [
                    { driverId: driverIdStr },
                    { deliveryDriverId: driverIdStr },
                    { returnDriverId: driverIdStr },
                ],
                status: 'Completed',
            });
        }
        const finalDriver = driver || {
            _id: user._id,
            userId: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            status: user.status === 'inactive' ? 'Deactivated' : 'Active',
            driverId: `DRV-${String(user._id).substring(18, 24).toUpperCase()}`,
            license: 'Standard',
            licenseExpiry: '2028-12-31',
            createdAt: user.createdAt,
        };
        return { ...finalDriver, completedContracts };
    }
    async create(body) {
        const existingDriver = await this.driverModel.findOne({ driverId: body.driverId });
        if (existingDriver) {
            throw new common_1.BadRequestException('A driver with this ID already exists');
        }
        if (body.password) {
            const existingUser = await this.userModel.findOne({ email: body.email });
            if (existingUser) {
                throw new common_1.BadRequestException('A user with this email already exists');
            }
            const hashedPassword = await bcrypt.hash(body.password, 10);
            await this.userModel.create({
                name: body.name,
                email: body.email,
                phone: body.phone,
                password: hashedPassword,
                role: 'driver',
                status: body.status === 'Deactivated' ? 'inactive' : 'active',
            });
        }
        const { password, ...driverData } = body;
        const newDriver = await this.driverModel.create(driverData);
        return newDriver;
    }
    async update(id, body) {
        const { password, ...driverData } = body;
        let driverDoc = null;
        let userDoc = null;
        if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
            driverDoc = await this.driverModel.findById(id);
            if (!driverDoc) {
                userDoc = await this.userModel.findById(id);
                if (userDoc?.email) {
                    driverDoc = await this.driverModel.findOne({ email: userDoc.email });
                }
            }
        }
        else {
            driverDoc = await this.driverModel.findOne({ $or: [{ driverId: id }, { email: id }] });
            if (!driverDoc) {
                userDoc = await this.userModel.findOne({ $or: [{ email: id }, { phone: id }] });
            }
        }
        if (!userDoc && driverDoc?.email) {
            userDoc = await this.userModel.findOne({ email: driverDoc.email });
        }
        if (!driverDoc && !userDoc) {
            throw new common_1.NotFoundException('Driver not found');
        }
        if (driverData.driverId && driverDoc) {
            const existingDriver = await this.driverModel.findOne({ driverId: driverData.driverId });
            if (existingDriver && existingDriver._id.toString() !== driverDoc._id.toString()) {
                throw new common_1.BadRequestException('Driver with this ID already exists');
            }
        }
        let updatedDriver = null;
        if (driverDoc) {
            updatedDriver = await this.driverModel.findByIdAndUpdate(driverDoc._id, driverData, {
                new: true,
                runValidators: true,
            });
        }
        if (userDoc) {
            const userUpdates = {};
            if (driverData.name)
                userUpdates.name = driverData.name;
            if (driverData.email)
                userUpdates.email = driverData.email;
            if (driverData.phone)
                userUpdates.phone = driverData.phone;
            if (driverData.status) {
                userUpdates.status = driverData.status === 'Deactivated' ? 'inactive' : 'active';
            }
            if (password) {
                userUpdates.password = await bcrypt.hash(password, 10);
            }
            if (Object.keys(userUpdates).length > 0) {
                await this.userModel.findByIdAndUpdate(userDoc._id, userUpdates);
            }
        }
        return updatedDriver || userDoc;
    }
    async remove(id) {
        if (id === 'all') {
            return this.removeAll();
        }
        let driverDoc = null;
        let userDoc = null;
        if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
            driverDoc = await this.driverModel.findById(id);
            if (!driverDoc) {
                userDoc = await this.userModel.findById(id);
                if (userDoc?.email) {
                    driverDoc = await this.driverModel.findOne({ email: userDoc.email });
                }
            }
        }
        else {
            driverDoc = await this.driverModel.findOne({ $or: [{ driverId: id }, { email: id }] });
            if (!driverDoc) {
                userDoc = await this.userModel.findOne({ $or: [{ email: id }, { phone: id }] });
            }
        }
        if (!userDoc && driverDoc?.email) {
            userDoc = await this.userModel.findOne({ email: driverDoc.email });
        }
        if (!driverDoc && userDoc?.email) {
            driverDoc = await this.driverModel.findOne({ email: userDoc.email });
        }
        if (!driverDoc && !userDoc) {
            throw new common_1.NotFoundException('Driver not found');
        }
        if (driverDoc) {
            await this.driverModel.findByIdAndDelete(driverDoc._id);
        }
        if (userDoc) {
            await this.userModel.findByIdAndDelete(userDoc._id);
        }
        const driverIdsToUnassign = [
            driverDoc?._id,
            userDoc?._id,
        ].filter(Boolean);
        if (driverIdsToUnassign.length > 0) {
            await this.contractModel.updateMany({
                $or: [
                    { driverId: { $in: driverIdsToUnassign } },
                    { deliveryDriverId: { $in: driverIdsToUnassign } },
                    { returnDriverId: { $in: driverIdsToUnassign } },
                ],
                status: { $in: ['Draft'] },
            }, {
                $unset: { driverId: 1, deliveryDriverId: 1, returnDriverId: 1 },
            });
        }
        return { message: 'Driver deleted successfully' };
    }
    async removeAll() {
        const drivers = await this.driverModel.find({}).lean();
        const emails = drivers.map((d) => d.email).filter(Boolean);
        await this.driverModel.deleteMany({});
        await this.userModel.deleteMany({
            $or: [
                { role: 'driver' },
                { email: { $in: emails } },
            ],
        });
        await this.contractModel.updateMany({ status: 'Draft' }, { $unset: { driverId: 1, deliveryDriverId: 1, returnDriverId: 1 } });
        return { message: 'All drivers deleted successfully' };
    }
};
exports.DriversService = DriversService;
exports.DriversService = DriversService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(driver_schema_1.Driver.name)),
    __param(1, (0, mongoose_1.InjectModel)(contract_schema_1.Contract.name)),
    __param(2, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], DriversService);
//# sourceMappingURL=drivers.service.js.map