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
exports.ContractsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const nodemailer = require("nodemailer");
const contract_schema_1 = require("./schemas/contract.schema");
const client_schema_1 = require("../clients/schemas/client.schema");
const unit_schema_1 = require("../units/schemas/unit.schema");
const user_schema_1 = require("../users/schemas/user.schema");
const damage_schema_1 = require("../damages/schemas/damage.schema");
const inspection_schema_1 = require("../inspections/schemas/inspection.schema");
const notification_schema_1 = require("../notifications/schemas/notification.schema");
const log_schema_1 = require("../logs/schemas/log.schema");
let ContractsService = class ContractsService {
    constructor(contractModel, clientModel, unitModel, userModel, damageModel, inspectionModel, notificationModel, logModel) {
        this.contractModel = contractModel;
        this.clientModel = clientModel;
        this.unitModel = unitModel;
        this.userModel = userModel;
        this.damageModel = damageModel;
        this.inspectionModel = inspectionModel;
        this.notificationModel = notificationModel;
        this.logModel = logModel;
    }
    getMailTransporter() {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }
    async findAll(driverId) {
        let filter = {};
        if (driverId) {
            const isValidObjectId = mongoose_2.default.Types.ObjectId.isValid(driverId);
            const objectId = isValidObjectId ? new mongoose_2.default.Types.ObjectId(driverId) : null;
            filter.$or = [
                { driverId: driverId },
                { deliveryDriverId: driverId },
                { returnDriverId: driverId },
                ...(objectId
                    ? [
                        { driverId: objectId },
                        { deliveryDriverId: objectId },
                        { returnDriverId: objectId },
                    ]
                    : []),
            ];
        }
        const contracts = await this.contractModel
            .find(filter)
            .sort({ createdAt: -1 })
            .populate({ path: 'clientId', select: 'name phone', strictPopulate: false })
            .populate({
            path: 'unitId',
            select: 'make model plate mileage images color year fuelType',
            strictPopulate: false,
        })
            .populate({ path: 'driverId', select: 'name', strictPopulate: false })
            .populate({ path: 'deliveryDriverId', select: 'name', strictPopulate: false })
            .populate({ path: 'returnDriverId', select: 'name', strictPopulate: false })
            .lean();
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const stats = {
            activeContracts: contracts.filter((c) => c.status === 'Active').length,
            pendingSignatures: contracts.filter((c) => c.status === 'Draft').length,
            completedThisMonth: contracts.filter((c) => c.status === 'Completed' && new Date(c.updatedAt) >= startOfMonth).length,
            cancelled: contracts.filter((c) => c.status === 'Cancelled').length,
        };
        const formattedContracts = contracts.map((c) => ({
            ...c,
            id: c.contractNumber ? String(c.contractNumber) : c._id.toString().substring(0, 8).toUpperCase(),
            contractNumber: c.contractNumber,
            _id: c._id.toString(),
            clientId: c.clientId?._id?.toString() || c.clientId || '',
            unitId: c.unitId?._id?.toString() || c.unitId || '',
            driverId: c.driverId?._id?.toString() || c.driverId || '',
            deliveryDriverId: c.deliveryDriverId?._id?.toString() || c.deliveryDriverId || '',
            returnDriverId: c.returnDriverId?._id?.toString() || c.returnDriverId || '',
            customer: c.clientId?.name || 'Unknown',
            customerPhone: c.clientId?.phone || '',
            driver: c.deliveryDriverId?.name || c.driverId?.name || 'None',
            deliveryDriver: c.deliveryDriverId?.name ||
                (c.driverId && !c.returnDriverId ? c.driverId?.name : 'None'),
            returnDriver: c.returnDriverId?.name || 'None',
            vehicle: c.unitId ? `${c.unitId.make} ${c.unitId.model} (${c.unitId.plate})` : 'Unknown Vehicle',
            vehiclePlate: c.unitId?.plate || '',
            vehicleColor: c.unitId?.color || '',
            vehicleYear: c.unitId?.year || '',
            vehicleFuel: c.unitId?.fuelType || '',
            vehicleImage: c.unitId?.images?.[0] || null,
            unitMileage: c.checkoutMileage !== undefined ? c.checkoutMileage : c.unitId?.mileage || 0,
            depositAmount: Number(c.depositAmount) || 0,
            rawStartDate: c.startDate,
            rawEndDate: c.endDate,
            checkoutTime: c.checkoutTime || '08:00 AM',
            checkinTime: c.checkinTime || '08:00 AM',
            startDate: new Date(c.startDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            }),
            endDate: new Date(c.endDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            }),
            deposit: `$${c.depositAmount || 0}`,
            rentAmount: `$${c.totalAmount || 0}`,
            status: c.status,
            createdAt: c.createdAt,
            notes: c.notes || '',
            returnNotes: c.returnNotes || '',
            pickupLocation: c.pickupLocation || 'Main Office',
            dropoffLocation: c.dropoffLocation || '',
            contractType: c.contractType || 'Delivery',
            deliveryStatus: c.deliveryStatus || 'Pending',
            paymentMethod: c.paymentMethod || 'Cash',
            paymentStatus: c.paymentStatus || 'Pending',
        }));
        return { contracts: formattedContracts, stats };
    }
    async findById(id) {
        let contract = null;
        if (mongoose_2.default.Types.ObjectId.isValid(id)) {
            contract = await this.contractModel
                .findById(id)
                .populate({ path: 'clientId', strictPopulate: false })
                .populate({ path: 'unitId', strictPopulate: false })
                .populate({ path: 'driverId', strictPopulate: false })
                .populate({ path: 'deliveryDriverId', strictPopulate: false })
                .populate({ path: 'returnDriverId', strictPopulate: false })
                .lean();
        }
        if (!contract && !isNaN(Number(id))) {
            contract = await this.contractModel
                .findOne({ contractNumber: Number(id) })
                .populate({ path: 'clientId', strictPopulate: false })
                .populate({ path: 'unitId', strictPopulate: false })
                .populate({ path: 'driverId', strictPopulate: false })
                .populate({ path: 'deliveryDriverId', strictPopulate: false })
                .populate({ path: 'returnDriverId', strictPopulate: false })
                .lean();
        }
        if (!contract) {
            throw new common_1.NotFoundException('Contract not found');
        }
        return contract;
    }
    async create(body, currentUser) {
        const userName = currentUser?.name || 'System';
        const userRole = currentUser?.role || 'admin';
        const start = new Date(body.startDate);
        const end = new Date(body.endDate);
        const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
        const dailyRate = body.dailyRate || 50;
        const babySeatFees = Number(body.babySeatFees) || 0;
        const tintingFees = Number(body.tintingFees) || 0;
        const deliveryCharges = Number(body.deliveryCharges) || 0;
        const salikFees = Number(body.salikFees !== undefined ? body.salikFees : body.salikCharge) || 0;
        const parkingFees = Number(body.parkingFees !== undefined ? body.parkingFees : body.parkingCharge) || 0;
        const finesFees = Number(body.finesFees !== undefined ? body.finesFees : body.finesCharge) || 0;
        const fuelFees = Number(body.fuelFees !== undefined ? body.fuelFees : body.fuelCharge) || 0;
        const cleaningFees = Number(body.cleaningFees) || 0;
        const totalAmount = body.totalAmount ||
            days * dailyRate + babySeatFees + tintingFees + deliveryCharges + salikFees + parkingFees + finesFees + fuelFees + cleaningFees;
        const unitDoc = await this.unitModel.findById(body.unitId);
        if (!unitDoc) {
            throw new common_1.NotFoundException('Selected vehicle not found.');
        }
        if (unitDoc.status?.toLowerCase() !== 'available') {
            throw new common_1.BadRequestException(`Vehicle (${unitDoc.make} ${unitDoc.model} - ${unitDoc.plate}) is currently ${unitDoc.status} and cannot be booked.`);
        }
        const existingActiveContract = await this.contractModel.findOne({
            unitId: body.unitId,
            status: { $in: ['Active', 'Draft'] },
        });
        if (existingActiveContract) {
            throw new common_1.BadRequestException(`Vehicle (${unitDoc.make} ${unitDoc.model} - ${unitDoc.plate}) is currently out on contract #${existingActiveContract._id
                .toString()
                .substring(0, 8)
                .toUpperCase()} and cannot be booked.`);
        }
        const checkoutMileage = unitDoc.mileage || 0;
        const contractType = body.contractType || 'Delivery';
        if (contractType === 'Shop' && !body.clientId) {
            throw new common_1.BadRequestException('Client is required for Shop contracts.');
        }
        const deliveryDriverId = body.deliveryDriverId || body.driverId || null;
        const returnDriverId = body.returnDriverId || null;
        const mainDriverId = deliveryDriverId || returnDriverId || null;
        if (contractType === 'Delivery' && !deliveryDriverId) {
            throw new common_1.BadRequestException('A delivery driver must be assigned for Delivery contracts.');
        }
        const lastContract = await this.contractModel
            .findOne({ contractNumber: { $exists: true, $ne: null } })
            .sort({ contractNumber: -1 })
            .select('contractNumber')
            .lean();
        const nextContractNumber = lastContract && typeof lastContract.contractNumber === 'number' && lastContract.contractNumber >= 2000
            ? lastContract.contractNumber + 1
            : 2000;
        const contract = await this.contractModel.create({
            contractNumber: nextContractNumber,
            clientId: body.clientId || null,
            unitId: body.unitId,
            contractType,
            driverId: mainDriverId,
            deliveryDriverId,
            returnDriverId,
            checkoutMileage,
            checkoutFuelLevel: body.checkoutFuelLevel !== undefined ? Number(body.checkoutFuelLevel) : 100,
            startDate: body.startDate,
            endDate: body.endDate,
            dailyRate: body.dailyRate || dailyRate,
            dailyKmLimit: body.dailyKmLimit || 0,
            pricePerExtraKm: body.pricePerExtraKm || 0,
            totalDays: days,
            totalAmount,
            depositAmount: body.depositAmount || 0,
            pickupLocation: body.pickupLocation || 'Main Office',
            dropoffLocation: body.dropoffLocation || '',
            status: contractType === 'Shop' ? 'Active' : (body.status || 'Draft'),
            notes: body.notes || '',
            returnNotes: body.returnNotes || '',
            checkoutTime: body.checkoutTime || '08:00 AM',
            checkinTime: body.checkinTime || '08:00 AM',
            babySeatFees,
            tintingFees,
            deliveryCharges,
            salikFees,
            parkingFees,
            finesFees,
            fuelFees,
            salikCharge: salikFees,
            parkingCharge: parkingFees,
            finesCharge: finesFees,
            fuelCharge: fuelFees,
            cleaningFees,
            customerSignature: body.customerSignature,
            inspectionPhotos: body.inspectionPhotos || [],
            deliveryStatus: contractType === 'Shop' ? 'Delivered' : body.deliveryStatus || 'Pending',
            paymentMethod: body.paymentMethod || 'Cash',
            paymentStatus: body.paymentStatus || 'Pending',
            additionalDriverName: body.additionalDriverName || '',
            additionalDriverLicense: body.additionalDriverLicense || '',
            additionalDriverNationality: body.additionalDriverNationality || '',
            additionalDriverPhone: body.additionalDriverPhone || '',
            additionalDriverExpiry: body.additionalDriverExpiry || '',
            additionalDriverIssuedAt: body.additionalDriverIssuedAt || '',
        });
        try {
            await this.notificationModel.create({
                title: 'New Contract Created',
                message: `Contract #${contract.contractNumber || contract._id.toString().substring(0, 8).toUpperCase()} was created.`,
                type: 'contract',
            });
        }
        catch (e) {
            console.error('Failed to create notification', e);
        }
        try {
            const count = await this.logModel.countDocuments();
            await this.logModel.create({
                logId: `LOG-${(count + 1).toString().padStart(3, '0')}`,
                user: userName,
                role: userRole,
                action: 'Contract Created',
                description: `Contract #${contract.contractNumber || contract._id.toString().substring(0, 8).toUpperCase()} generated.`,
                type: 'create',
                ip: '127.0.0.1',
            });
        }
        catch (e) {
            console.error('Failed to create log', e);
        }
        await this.unitModel.findByIdAndUpdate(body.unitId, { status: 'Rented' });
        const assignedDriverId = deliveryDriverId || body.driverId;
        if (assignedDriverId) {
            this.notifyDriver({
                driverId: assignedDriverId.toString(),
                contractId: contract._id.toString(),
                type: 'delivery_assigned',
            }).catch((err) => console.error('Driver notification error:', err));
        }
        return contract;
    }
    async update(id, body, currentUser) {
        const userName = currentUser?.name || 'System';
        const userRole = currentUser?.role || 'admin';
        const existingContract = await this.contractModel.findById(id);
        if (!existingContract) {
            throw new common_1.NotFoundException('Contract not found');
        }
        const startDateVal = body.startDate ? new Date(body.startDate) : new Date(existingContract.startDate);
        const endDateVal = body.endDate ? new Date(body.endDate) : new Date(existingContract.endDate);
        const dailyRateVal = body.dailyRate !== undefined ? Number(body.dailyRate) : existingContract.dailyRate;
        const babySeatFees = body.babySeatFees !== undefined ? Number(body.babySeatFees) : existingContract.babySeatFees || 0;
        const tintingFees = body.tintingFees !== undefined ? Number(body.tintingFees) : existingContract.tintingFees || 0;
        const deliveryCharges = body.deliveryCharges !== undefined ? Number(body.deliveryCharges) : existingContract.deliveryCharges || 0;
        const salikFees = body.salikFees !== undefined ? Number(body.salikFees) : (body.salikCharge !== undefined ? Number(body.salikCharge) : (existingContract.salikFees || existingContract.salikCharge || 0));
        const parkingFees = body.parkingFees !== undefined ? Number(body.parkingFees) : (body.parkingCharge !== undefined ? Number(body.parkingCharge) : (existingContract.parkingFees || existingContract.parkingCharge || 0));
        const finesFees = body.finesFees !== undefined ? Number(body.finesFees) : (body.finesCharge !== undefined ? Number(body.finesCharge) : (existingContract.finesFees || existingContract.finesCharge || 0));
        const fuelFees = body.fuelFees !== undefined ? Number(body.fuelFees) : (body.fuelCharge !== undefined ? Number(body.fuelCharge) : (existingContract.fuelFees || existingContract.fuelCharge || 0));
        const cleaningFees = body.cleaningFees !== undefined ? Number(body.cleaningFees) : existingContract.cleaningFees || 0;
        const diffTime = Math.abs(endDateVal.getTime() - startDateVal.getTime());
        const totalDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        const extraKmCharge = body.extraKmCharge !== undefined ? Number(body.extraKmCharge) : existingContract.extraKmCharge || 0;
        const damageCharge = body.damageCharge !== undefined ? Number(body.damageCharge) : existingContract.damageCharge || 0;
        const totalAmount = totalDays * dailyRateVal +
            babySeatFees +
            tintingFees +
            deliveryCharges +
            salikFees +
            parkingFees +
            finesFees +
            fuelFees +
            cleaningFees +
            extraKmCharge +
            damageCharge;
        const updatedData = {
            ...body,
            totalDays,
            totalAmount,
            salikFees,
            parkingFees,
            finesFees,
            fuelFees,
            salikCharge: salikFees,
            parkingCharge: parkingFees,
            finesCharge: finesFees,
            fuelCharge: fuelFees,
        };
        if (body.unitId && body.unitId.toString() !== existingContract.unitId?.toString()) {
            const newUnitDoc = await this.unitModel.findById(body.unitId);
            if (!newUnitDoc) {
                throw new common_1.NotFoundException('Selected replacement vehicle not found.');
            }
            if (newUnitDoc.status?.toLowerCase() !== 'available') {
                throw new common_1.BadRequestException(`Vehicle (${newUnitDoc.make} ${newUnitDoc.model} - ${newUnitDoc.plate}) is currently ${newUnitDoc.status} and cannot be assigned.`);
            }
            const conflictingContract = await this.contractModel.findOne({
                _id: { $ne: id },
                unitId: body.unitId,
                status: { $in: ['Active', 'Draft'] },
            });
            if (conflictingContract) {
                throw new common_1.BadRequestException(`Vehicle (${newUnitDoc.make} ${newUnitDoc.model} - ${newUnitDoc.plate}) is already assigned to active contract #${conflictingContract._id
                    .toString()
                    .substring(0, 8)
                    .toUpperCase()}.`);
            }
            if (existingContract.unitId) {
                await this.unitModel.findByIdAndUpdate(existingContract.unitId, { status: 'Available' });
            }
            await this.unitModel.findByIdAndUpdate(body.unitId, { status: 'Rented' });
        }
        if (body.driverId !== undefined)
            updatedData.driverId = body.driverId || null;
        if (body.deliveryDriverId !== undefined)
            updatedData.deliveryDriverId = body.deliveryDriverId || null;
        if (body.returnDriverId !== undefined)
            updatedData.returnDriverId = body.returnDriverId || null;
        if (body.returnFuelLevel !== undefined)
            updatedData.returnFuelLevel = Number(body.returnFuelLevel);
        if (body.checkoutFuelLevel !== undefined)
            updatedData.checkoutFuelLevel = Number(body.checkoutFuelLevel);
        if (body.status === 'Completed') {
            updatedData.deliveryStatus = 'Returned';
        }
        if (body.deliveryStatus === 'Delivered' && existingContract.deliveryStatus !== 'Delivered') {
            if (existingContract.status === 'Draft') {
                updatedData.status = 'Active';
            }
            await this.unitModel.findByIdAndUpdate(existingContract.unitId, { status: 'Rented' });
            try {
                const count = await this.logModel.countDocuments();
                await this.logModel.create({
                    logId: `LOG-${(count + 1).toString().padStart(3, '0')}`,
                    user: userName,
                    role: userRole,
                    action: 'Vehicle Delivered',
                    description: `Contract ${existingContract._id.toString().substring(0, 8).toUpperCase()} vehicle delivered to client.`,
                    type: 'edit',
                    ip: '127.0.0.1',
                });
                await this.notificationModel.create({
                    title: 'Vehicle Delivered',
                    message: `Vehicle for contract ${existingContract._id.toString().substring(0, 8).toUpperCase()} delivered to client.`,
                    type: 'contract',
                });
            }
            catch (logErr) {
                console.error('Failed to log delivery:', logErr);
            }
            this.notifyAdmin({ contractId: existingContract._id.toString(), type: 'vehicle_delivered' }).catch((err) => console.error('Admin notify failed:', err));
            this.sendClient({ contractId: existingContract._id.toString(), type: 'initial' }).catch((err) => console.error('Client send failed:', err));
        }
        const updatedContract = await this.contractModel.findByIdAndUpdate(id, updatedData, {
            new: true,
            runValidators: true,
        });
        if (!updatedContract) {
            throw new common_1.BadRequestException('Failed to update contract');
        }
        if (body.deliveryDriverId && body.deliveryDriverId !== existingContract.deliveryDriverId?.toString()) {
            this.notifyDriver({
                driverId: body.deliveryDriverId,
                contractId: id,
                type: 'delivery_assigned',
            }).catch((e) => console.error('Delivery driver notify failed:', e));
        }
        if (body.returnDriverId && body.returnDriverId !== existingContract.returnDriverId?.toString()) {
            this.notifyDriver({
                driverId: body.returnDriverId,
                contractId: id,
                type: 'return_assigned',
            }).catch((e) => console.error('Return driver notify failed:', e));
        }
        const unitBeforeUpdate = await this.unitModel.findById(existingContract.unitId);
        const initialMileage = existingContract.checkoutMileage || unitBeforeUpdate?.mileage || 0;
        if (body.status && body.status !== existingContract.status) {
            if (body.status === 'Completed' || body.status === 'Cancelled') {
                let nextUnitStatus = 'Available';
                const hasPendingDamage = await this.damageModel.findOne({
                    unitId: existingContract.unitId,
                    status: 'Pending',
                });
                if (hasPendingDamage || (body.newDamages && body.newDamages !== 'None' && body.newDamages !== '')) {
                    nextUnitStatus = 'Maintenance';
                }
                const updateData = { status: nextUnitStatus };
                if (body.status === 'Completed' && body.returnOdometer !== undefined) {
                    updateData.mileage = Number(body.returnOdometer);
                }
                if (body.status === 'Completed' && Array.isArray(body.returnPhotos) && body.returnPhotos.length > 0) {
                    updateData.images = body.returnPhotos.filter((url) => typeof url === 'string' && url.trim() !== '');
                }
                await this.unitModel.findByIdAndUpdate(existingContract.unitId, updateData);
            }
            else if (body.status === 'Active') {
                await this.unitModel.findByIdAndUpdate(existingContract.unitId, { status: 'Rented' });
            }
        }
        try {
            const count = await this.logModel.countDocuments();
            const moneyCollectedInfo = body.returnAmountCollected !== undefined
                ? ` Rest of money collected: $${body.returnAmountCollected} (${body.returnPaymentMethod || 'Cash'}).`
                : '';
            await this.logModel.create({
                logId: `LOG-${(count + 1).toString().padStart(3, '0')}`,
                user: userName,
                role: userRole,
                action: body.status === 'Completed' ? 'Vehicle Returned & Settled' : 'Contract Updated',
                description: `Contract ${updatedContract._id.toString().substring(0, 8).toUpperCase()} was ${body.status === 'Completed' ? 'completed/returned' : 'updated'}.${moneyCollectedInfo}`,
                type: 'edit',
                ip: '127.0.0.1',
            });
            if (body.status === 'Completed' && body.status !== existingContract.status) {
                await this.notificationModel.create({
                    title: 'Vehicle Returned & Settled',
                    message: `Contract ${updatedContract._id.toString().substring(0, 8).toUpperCase()} was returned. Driver confirmed collecting ${body.returnAmountCollected !== undefined ? `$${body.returnAmountCollected}` : 'remaining balance'} to admin.`,
                    type: 'alert',
                });
                this.notifyAdmin({ contractId: existingContract._id.toString(), type: 'vehicle_returned' }).catch((e) => console.error('Admin return notify failed:', e));
                try {
                    const returnOdo = Number(body.returnOdometer) || initialMileage;
                    const inspCount = await this.inspectionModel.countDocuments();
                    const existingBefore = await this.inspectionModel.findOne({
                        contractId: existingContract._id,
                        type: 'Before Rental',
                    });
                    if (!existingBefore) {
                        await this.inspectionModel.create({
                            inspectionId: `INSP-${(inspCount + 1).toString().padStart(4, '0')}`,
                            type: 'Before Rental',
                            contractId: existingContract._id,
                            unitId: existingContract.unitId,
                            driverId: existingContract.driverId,
                            date: existingContract.startDate,
                            time: existingContract.checkoutTime || '08:00 AM',
                            mileage: initialMileage,
                            fuelLevel: Number(existingContract.checkoutFuelLevel || 100),
                            damages: 'None',
                            photos: updatedContract.inspectionPhotos || [],
                            status: 'Completed',
                        });
                    }
                    const existingAfter = await this.inspectionModel.findOne({
                        contractId: existingContract._id,
                        type: 'After Rental',
                    });
                    if (!existingAfter) {
                        await this.inspectionModel.create({
                            inspectionId: `INSP-${(inspCount + (existingBefore ? 1 : 2)).toString().padStart(4, '0')}`,
                            type: 'After Rental',
                            contractId: existingContract._id,
                            unitId: existingContract.unitId,
                            driverId: existingContract.driverId,
                            date: new Date(),
                            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                            mileage: returnOdo,
                            fuelLevel: Number(body.returnFuelLevel !== undefined ? body.returnFuelLevel : (existingContract.returnFuelLevel || 100)),
                            damages: body.newDamages || 'None',
                            photos: updatedContract.returnPhotos || [],
                            status: 'Completed',
                        });
                    }
                    if (body.newDamages && body.newDamages !== 'None') {
                        const existingDamage = await this.damageModel.findOne({ contractId: existingContract._id });
                        if (!existingDamage) {
                            const damageCount = await this.damageModel.countDocuments();
                            await this.damageModel.create({
                                damageId: `DMG-${(damageCount + 1).toString().padStart(4, '0')}`,
                                unitId: existingContract.unitId,
                                contractId: existingContract._id,
                                description: body.newDamages,
                                cost: 0,
                                status: 'Pending',
                                photos: Array.isArray(body.damagePhotos) ? body.damagePhotos : [],
                                reportedByRole: userRole || 'driver',
                                reportedByName: userName || 'Driver',
                                reportedDate: new Date(),
                            });
                            await this.notificationModel.create({
                                title: 'New Damage Reported',
                                message: `Driver recorded new damages for contract ${existingContract._id.toString().substring(0, 8).toUpperCase()}: "${body.newDamages}". Admin evaluation needed.`,
                                type: 'alert',
                            });
                        }
                    }
                }
                catch (inspErr) {
                    console.error('Failed to generate inspections', inspErr);
                }
            }
        }
        catch (e) {
            console.error('Failed to log contract update', e);
        }
        return updatedContract;
    }
    async patch(id, body, currentUser) {
        const userName = currentUser?.name || 'Driver';
        const contract = await this.contractModel.findById(id);
        if (!contract) {
            throw new common_1.NotFoundException('Contract not found');
        }
        if (body.clientId) {
            const clientDoc = await this.clientModel.findById(body.clientId);
            if (!clientDoc) {
                throw new common_1.NotFoundException('Client not found');
            }
            contract.clientId = body.clientId;
        }
        await contract.save();
        try {
            const count = await this.logModel.countDocuments();
            await this.logModel.create({
                logId: `LOG-${(count + 1).toString().padStart(3, '0')}`,
                user: userName,
                role: 'driver',
                action: 'Client Linked to Contract',
                description: `Client was registered and linked to Delivery contract ${contract._id.toString().substring(0, 8).toUpperCase()} by driver.`,
                type: 'edit',
                ip: '127.0.0.1',
            });
            await this.notificationModel.create({
                title: 'Client Registered by Driver',
                message: `Driver registered a new client and linked them to contract ${contract._id.toString().substring(0, 8).toUpperCase()}.`,
                type: 'contract',
            });
        }
        catch (e) {
            console.error('Failed to log client link:', e);
        }
        return contract;
    }
    async remove(id) {
        const deletedContract = await this.contractModel.findByIdAndDelete(id);
        if (!deletedContract) {
            throw new common_1.NotFoundException('Contract not found');
        }
        await this.damageModel.deleteMany({ contractId: id });
        await this.inspectionModel.deleteMany({ contractId: id });
        if (deletedContract.unitId) {
            const otherContract = await this.contractModel.findOne({
                unitId: deletedContract.unitId,
                _id: { $ne: deletedContract._id },
                status: { $in: ['Active', 'Draft'] },
            });
            if (!otherContract) {
                const hasPendingDamage = await this.damageModel.findOne({
                    unitId: deletedContract.unitId,
                    status: 'Pending',
                });
                await this.unitModel.findByIdAndUpdate(deletedContract.unitId, {
                    status: hasPendingDamage ? 'Maintenance' : 'Available',
                });
            }
        }
        return { message: 'Contract deleted successfully' };
    }
    async notifyDriver(payload) {
        const { driverId, contractId, type } = payload;
        const driver = await this.userModel.findById(driverId);
        if (!driver)
            throw new common_1.NotFoundException('Driver not found');
        const contract = (await this.contractModel
            .findById(contractId)
            .populate({ path: 'clientId', select: 'name phone', strictPopulate: false })
            .populate({ path: 'unitId', select: 'make model plate', strictPopulate: false })
            .lean());
        if (!contract)
            throw new common_1.NotFoundException('Contract not found');
        const contractNum = contract._id.toString().substring(0, 8).toUpperCase();
        const vehicleName = contract.unitId ? `${contract.unitId.make} ${contract.unitId.model}` : 'Vehicle';
        const vehiclePlate = contract.unitId?.plate || '';
        const clientName = contract.clientId?.name || 'Client';
        const clientPhone = contract.clientId?.phone || '';
        const startDate = new Date(contract.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const endDate = new Date(contract.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const isDelivery = type === 'delivery_assigned';
        const taskArabicTitle = isDelivery
            ? '🚗 مهمة تسليم سيارة للعميل (Give a Car)'
            : '🔄 مهمة استلام وإرجاع سيارة (Pick a Car & Return)';
        const taskType = isDelivery ? 'Vehicle Delivery' : 'Vehicle Return Pickup';
        const location = isDelivery
            ? contract.pickupLocation || 'Main Office'
            : contract.dropoffLocation || contract.pickupLocation || 'Location TBD';
        const time = isDelivery ? contract.checkoutTime || '08:00 AM' : contract.checkinTime || '10:00 AM';
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const actionUrl = isDelivery
            ? `${baseUrl}/driver/delivery?contractId=${contract._id}`
            : `${baseUrl}/driver/return?contractId=${contract._id}`;
        const results = { email: false, whatsapp: false };
        if (driver.email && process.env.SMTP_USER && process.env.SMTP_PASS) {
            try {
                const transporter = this.getMailTransporter();
                const emailHtml = `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a2e; line-height: 1.7;">
            <div style="background: ${isDelivery ? '#10b981' : '#2563eb'}; padding: 24px 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 20px;">${taskArabicTitle}</h1>
              <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 14px;">Contract #${contractNum} — ${taskType}</p>
            </div>
            <div style="padding: 28px 30px; background: #f8fafc; border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px; margin: 0 0 15px;">Hello <strong>${driver.name}</strong>,</p>
              <p style="font-size: 14px; margin-bottom: 20px;">
                ${isDelivery
                    ? 'لديك طلب جديد لتوصيل وتسليم سيارة للعميل (Give a Car to Client).'
                    : 'لديك طلب جديد لاستلام السيارة من العميل وإرجاعها (Pick up Car & Return it).'}
              </p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
                <tr><td style="padding: 8px 0; color: #64748b;">السيارة / Vehicle</td><td style="padding: 8px 0; font-weight: 600;">${vehicleName} (${vehiclePlate})</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b;">العميل / Client</td><td style="padding: 8px 0; font-weight: 600;">${clientName}${clientPhone ? ` — ${clientPhone}` : ''}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b;">${isDelivery ? 'موقع التسليم / Delivery' : 'موقع الاستلام / Pickup'}</td><td style="padding: 8px 0; font-weight: 600;">${location}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b;">التوقيت / Time</td><td style="padding: 8px 0; font-weight: 600;">${time}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b;">الفترة / Period</td><td style="padding: 8px 0; font-weight: 600;">${startDate} → ${endDate}</td></tr>
              </table>
              <div style="margin: 25px 0; text-align: center;">
                <a href="${actionUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; background: ${isDelivery ? '#10b981' : '#2563eb'}; color: white; text-decoration: none; font-weight: bold; border-radius: 8px; font-size: 14px;">
                  📲 فتح مهمة السائق (${isDelivery ? 'Confirm Handover' : 'Process Return'})
                </a>
              </div>
              <p style="font-size: 13px; color: #64748b; margin-top: 24px;">— Leon Rent Car Dispatch</p>
            </div>
          </div>
        `;
                await transporter.sendMail({
                    from: `"Leon Rent Car Dispatch" <${process.env.SMTP_USER}>`,
                    to: driver.email,
                    subject: `${taskArabicTitle} — #${contractNum} | ${vehicleName}`,
                    html: emailHtml,
                });
                results.email = true;
            }
            catch (err) {
                console.error('Driver email failed:', err);
            }
        }
        const driverPhone = driver.phone;
        const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
        const token = process.env.ULTRAMSG_TOKEN;
        if (driverPhone && instanceId && token) {
            try {
                const whatsappMsg = `*${taskArabicTitle}*\n` +
                    `━━━━━━━━━━━━━━━━━━\n` +
                    `📄 رقم العقد / Contract: #${contractNum}\n` +
                    `🚙 السيارة / Vehicle: ${vehicleName} (${vehiclePlate})\n` +
                    `👤 العميل / Client: ${clientName}${clientPhone ? ` — ${clientPhone}` : ''}\n` +
                    `📍 ${isDelivery ? 'موقع التسليم / Delivery' : 'موقع الاستلام / Pickup'}: ${location}\n` +
                    `⏰ التوقيت المحدد / Time: ${time}\n` +
                    `📅 فترة الإيجار / Period: ${startDate} → ${endDate}\n` +
                    `\n📲 رابط المهمة للسائق:\n${actionUrl}\n\n` +
                    `— Leon Rent Car Dispatch`;
                const response = await fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ token, to: driverPhone, body: whatsappMsg }),
                });
                if (response.ok)
                    results.whatsapp = true;
            }
            catch (waErr) {
                console.error('Driver WA failed:', waErr);
            }
        }
        return { success: true, results };
    }
    async notifyAdmin(payload) {
        const { contractId, type } = payload;
        const contract = (await this.contractModel
            .findById(contractId)
            .populate({ path: 'clientId', select: 'name phone', strictPopulate: false })
            .populate({ path: 'unitId', select: 'make model plate', strictPopulate: false })
            .populate({ path: 'deliveryDriverId', select: 'name', strictPopulate: false })
            .populate({ path: 'returnDriverId', select: 'name', strictPopulate: false })
            .lean());
        if (!contract)
            throw new common_1.NotFoundException('Contract not found');
        const contractNum = contract._id.toString().substring(0, 8).toUpperCase();
        const vehicleName = contract.unitId ? `${contract.unitId.make} ${contract.unitId.model}` : 'Vehicle';
        const vehiclePlate = contract.unitId?.plate || '';
        const clientName = contract.clientId?.name || 'Client';
        const isDelivered = type === 'vehicle_delivered';
        const eventTitle = isDelivered ? 'Vehicle Delivered to Client ✅' : 'Vehicle Returned & Collected ✅';
        const driverName = isDelivered
            ? contract.deliveryDriverId?.name || 'Driver'
            : contract.returnDriverId?.name || 'Driver';
        const adminEmail = process.env.SMTP_USER;
        const results = { email: false, whatsapp: false };
        if (adminEmail && process.env.SMTP_PASS) {
            try {
                const transporter = this.getMailTransporter();
                const emailHtml = `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a2e;">
            <div style="background: ${isDelivered ? '#10b981' : '#3b82f6'}; padding: 24px 30px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 20px;">${eventTitle}</h1>
              <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 14px;">Contract #${contractNum}</p>
            </div>
            <div style="padding: 28px 30px; background: #f8fafc; border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px;">Hello <strong>Admin</strong>,</p>
              <p>${isDelivered ? `Driver <strong>${driverName}</strong> has delivered the vehicle.` : `Driver <strong>${driverName}</strong> has picked up and returned the vehicle.`}</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
                <tr><td style="padding: 8px 0; color: #64748b;">Vehicle</td><td style="padding: 8px 0; font-weight: 600;">${vehicleName} (${vehiclePlate})</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b;">Client</td><td style="padding: 8px 0; font-weight: 600;">${clientName}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b;">Driver</td><td style="padding: 8px 0; font-weight: 600;">${driverName}</td></tr>
              </table>
            </div>
          </div>
        `;
                await transporter.sendMail({
                    from: `"Wheelzie System" <${process.env.SMTP_USER}>`,
                    to: adminEmail,
                    subject: `${isDelivered ? '✅' : '🔄'} ${isDelivered ? 'Vehicle Delivered' : 'Vehicle Returned & Settled'} — #${contractNum} | ${vehicleName}`,
                    html: emailHtml,
                });
                results.email = true;
            }
            catch (err) {
                console.error('Admin email error:', err);
            }
        }
        return { success: true, results };
    }
    async sendClient(payload) {
        const { contractId, type } = payload;
        const contract = (await this.contractModel
            .findById(contractId)
            .populate({ path: 'clientId', strictPopulate: false })
            .populate({ path: 'unitId', select: 'make model plate color year', strictPopulate: false })
            .populate({ path: 'deliveryDriverId', select: 'name phone', strictPopulate: false })
            .populate({ path: 'returnDriverId', select: 'name phone', strictPopulate: false })
            .lean());
        if (!contract || !contract.clientId?.email) {
            return { skipped: true, reason: 'No client or email' };
        }
        const clientEmail = contract.clientId.email;
        const contractNum = contract._id.toString().substring(0, 8).toUpperCase();
        const vehicleName = contract.unitId ? `${contract.unitId.make} ${contract.unitId.model}` : 'Vehicle';
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            try {
                const transporter = this.getMailTransporter();
                await transporter.sendMail({
                    from: `"Wheelzie Rentals" <${process.env.SMTP_USER}>`,
                    to: clientEmail,
                    subject: `Rental Contract #${contractNum} — ${vehicleName} | Wheelzie`,
                    html: `<p>Hello ${contract.clientId.name}, your rental contract details are confirmed.</p>`,
                });
                return { success: true };
            }
            catch (err) {
                console.error('Client send email failed:', err);
            }
        }
        return { success: false };
    }
    async sendEmail(payload) {
        const { email, clientName, pdfUrl } = payload;
        if (!email)
            throw new common_1.BadRequestException('Email is required');
        const transporter = this.getMailTransporter();
        await transporter.sendMail({
            from: `"Wheelzie Rentals" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `Your Vehicle Rental Contract - Wheelzie`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
          <h2 style="color: #2F3645;">Hello ${clientName},</h2>
          <p>Thank you for choosing Wheelzie for your rental needs!</p>
          <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px; text-align: center;">
            <a href="${pdfUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; font-weight: bold; border-radius: 6px;">
              View & Download Your Contract
            </a>
          </div>
        </div>
      `,
        });
        return { success: true, message: 'Email sent successfully' };
    }
    async sendWhatsApp(payload) {
        const { phone, message } = payload;
        if (!phone)
            throw new common_1.BadRequestException('Phone number is required');
        const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
        const token = process.env.ULTRAMSG_TOKEN;
        if (!instanceId || !token) {
            throw new common_1.BadRequestException('WhatsApp service is not configured');
        }
        const response = await fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ token, to: phone, body: message }),
        });
        if (!response.ok) {
            throw new common_1.BadRequestException('Failed to send WhatsApp message');
        }
        return { success: true, message: 'WhatsApp message triggered successfully' };
    }
};
exports.ContractsService = ContractsService;
exports.ContractsService = ContractsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(contract_schema_1.Contract.name)),
    __param(1, (0, mongoose_1.InjectModel)(client_schema_1.Client.name)),
    __param(2, (0, mongoose_1.InjectModel)(unit_schema_1.Unit.name)),
    __param(3, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(4, (0, mongoose_1.InjectModel)(damage_schema_1.Damage.name)),
    __param(5, (0, mongoose_1.InjectModel)(inspection_schema_1.Inspection.name)),
    __param(6, (0, mongoose_1.InjectModel)(notification_schema_1.Notification.name)),
    __param(7, (0, mongoose_1.InjectModel)(log_schema_1.Log.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], ContractsService);
//# sourceMappingURL=contracts.service.js.map