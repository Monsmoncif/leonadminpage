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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractSchema = exports.Contract = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let Contract = class Contract {
};
exports.Contract = Contract;
__decorate([
    (0, mongoose_1.Prop)({ type: Number, unique: true, sparse: true }),
    __metadata("design:type", Number)
], Contract.prototype, "contractNumber", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.default.Schema.Types.ObjectId, ref: 'Unit', required: true }),
    __metadata("design:type", mongoose_2.default.Types.ObjectId)
], Contract.prototype, "unitId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.default.Schema.Types.ObjectId, ref: 'Client', required: false }),
    __metadata("design:type", mongoose_2.default.Types.ObjectId)
], Contract.prototype, "clientId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['Delivery', 'Shop'], default: 'Delivery' }),
    __metadata("design:type", String)
], Contract.prototype, "contractType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['Daily', 'Monthly'], default: 'Daily' }),
    __metadata("design:type", String)
], Contract.prototype, "rentalType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['B2C', 'B2B'], default: 'B2C' }),
    __metadata("design:type", String)
], Contract.prototype, "customerType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.default.Schema.Types.ObjectId, ref: 'User', required: false }),
    __metadata("design:type", mongoose_2.default.Types.ObjectId)
], Contract.prototype, "driverId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.default.Schema.Types.ObjectId, ref: 'User', required: false }),
    __metadata("design:type", mongoose_2.default.Types.ObjectId)
], Contract.prototype, "deliveryDriverId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.default.Schema.Types.ObjectId, ref: 'User', required: false }),
    __metadata("design:type", mongoose_2.default.Types.ObjectId)
], Contract.prototype, "returnDriverId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], Contract.prototype, "startDate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], Contract.prototype, "endDate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], Contract.prototype, "dailyRate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Contract.prototype, "dailyKmLimit", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Contract.prototype, "pricePerExtraKm", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], Contract.prototype, "totalDays", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], Contract.prototype, "totalAmount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], Contract.prototype, "depositAmount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Contract.prototype, "checkoutMileage", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 100 }),
    __metadata("design:type", Number)
], Contract.prototype, "checkoutFuelLevel", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Contract.prototype, "extraKmCharge", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Contract.prototype, "pickupLocation", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: '' }),
    __metadata("design:type", String)
], Contract.prototype, "dropoffLocation", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: '07:00 AM' }),
    __metadata("design:type", String)
], Contract.prototype, "checkoutTime", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: '07:00 AM' }),
    __metadata("design:type", String)
], Contract.prototype, "checkinTime", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Contract.prototype, "additionalDriverName", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Contract.prototype, "additionalDriverLicense", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Contract.prototype, "additionalDriverNationality", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Contract.prototype, "additionalDriverPhone", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Contract.prototype, "additionalDriverExpiry", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Contract.prototype, "additionalDriverIssuedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Contract.prototype, "babySeatFees", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Contract.prototype, "tintingFees", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Contract.prototype, "deliveryCharges", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Contract.prototype, "salikFees", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Contract.prototype, "parkingFees", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Contract.prototype, "finesFees", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Contract.prototype, "fuelFees", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Contract.prototype, "salikCharge", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Contract.prototype, "parkingCharge", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Contract.prototype, "finesCharge", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Contract.prototype, "fuelCharge", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Contract.prototype, "cleaningFees", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Contract.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Contract.prototype, "returnNotes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: 'Cash' }),
    __metadata("design:type", String)
], Contract.prototype, "paymentMethod", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['Pending', 'Partial', 'Paid'], default: 'Pending' }),
    __metadata("design:type", String)
], Contract.prototype, "paymentStatus", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['Draft', 'Active', 'Completed', 'Cancelled'],
        default: 'Draft',
    }),
    __metadata("design:type", String)
], Contract.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], Contract.prototype, "inspectionPhotos", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Contract.prototype, "customerSignature", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Contract.prototype, "adminSignature", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], Contract.prototype, "signatureMetadata", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['Pending', 'Delivered', 'Returned'],
        default: 'Pending',
    }),
    __metadata("design:type", String)
], Contract.prototype, "deliveryStatus", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Contract.prototype, "returnOdometer", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Contract.prototype, "returnFuelLevel", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], Contract.prototype, "returnPhotos", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], Contract.prototype, "damagePhotos", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Contract.prototype, "newDamages", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Contract.prototype, "damageCharge", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Contract.prototype, "returnAmountCollected", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'Cash' }),
    __metadata("design:type", String)
], Contract.prototype, "returnPaymentMethod", void 0);
exports.Contract = Contract = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Contract);
exports.ContractSchema = mongoose_1.SchemaFactory.createForClass(Contract);
//# sourceMappingURL=contract.schema.js.map