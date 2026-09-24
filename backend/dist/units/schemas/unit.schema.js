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
exports.UnitSchema = exports.Unit = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let Unit = class Unit {
};
exports.Unit = Unit;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Unit.prototype, "make", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Unit.prototype, "model", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], Unit.prototype, "year", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], Unit.prototype, "plate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], Unit.prototype, "vin", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Unit.prototype, "color", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 0 }),
    __metadata("design:type", Number)
], Unit.prototype, "mileage", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['Available', 'Rented', 'Maintenance', 'Out of Service'],
        default: 'Available',
    }),
    __metadata("design:type", String)
], Unit.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], Unit.prototype, "images", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], Unit.prototype, "documents", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Unit.prototype, "dailyRate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Unit.prototype, "dailyKmLimit", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Unit.prototype, "pricePerExtraKm", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['Automatic', 'Manual'], default: 'Automatic' }),
    __metadata("design:type", String)
], Unit.prototype, "transmission", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 5 }),
    __metadata("design:type", Number)
], Unit.prototype, "capacity", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid'],
        default: 'Petrol',
    }),
    __metadata("design:type", String)
], Unit.prototype, "fuelType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], Unit.prototype, "features", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: '' }),
    __metadata("design:type", String)
], Unit.prototype, "description", void 0);
exports.Unit = Unit = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Unit);
exports.UnitSchema = mongoose_1.SchemaFactory.createForClass(Unit);
//# sourceMappingURL=unit.schema.js.map