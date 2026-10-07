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
exports.InspectionSchema = exports.Inspection = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let Inspection = class Inspection {
};
exports.Inspection = Inspection;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], Inspection.prototype, "inspectionId", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['Before Rental', 'After Rental'],
        required: true,
    }),
    __metadata("design:type", String)
], Inspection.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.default.Schema.Types.ObjectId, ref: 'Contract', required: true }),
    __metadata("design:type", mongoose_2.default.Types.ObjectId)
], Inspection.prototype, "contractId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.default.Schema.Types.ObjectId, ref: 'Unit', required: true }),
    __metadata("design:type", mongoose_2.default.Types.ObjectId)
], Inspection.prototype, "unitId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.default.Schema.Types.ObjectId, ref: 'User', required: false }),
    __metadata("design:type", mongoose_2.default.Types.ObjectId)
], Inspection.prototype, "driverId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: Date.now }),
    __metadata("design:type", Date)
], Inspection.prototype, "date", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Inspection.prototype, "time", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], Inspection.prototype, "mileage", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: 0, max: 100 }),
    __metadata("design:type", Number)
], Inspection.prototype, "fuelLevel", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: '' }),
    __metadata("design:type", String)
], Inspection.prototype, "damages", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], Inspection.prototype, "photos", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['Completed', 'Pending'], default: 'Completed' }),
    __metadata("design:type", String)
], Inspection.prototype, "status", void 0);
exports.Inspection = Inspection = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Inspection);
exports.InspectionSchema = mongoose_1.SchemaFactory.createForClass(Inspection);
//# sourceMappingURL=inspection.schema.js.map