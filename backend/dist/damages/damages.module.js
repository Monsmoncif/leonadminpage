"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DamagesModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const damages_service_1 = require("./damages.service");
const damages_controller_1 = require("./damages.controller");
const damage_schema_1 = require("./schemas/damage.schema");
const contract_schema_1 = require("../contracts/schemas/contract.schema");
const unit_schema_1 = require("../units/schemas/unit.schema");
const log_schema_1 = require("../logs/schemas/log.schema");
const notification_schema_1 = require("../notifications/schemas/notification.schema");
let DamagesModule = class DamagesModule {
};
exports.DamagesModule = DamagesModule;
exports.DamagesModule = DamagesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: damage_schema_1.Damage.name, schema: damage_schema_1.DamageSchema },
                { name: contract_schema_1.Contract.name, schema: contract_schema_1.ContractSchema },
                { name: unit_schema_1.Unit.name, schema: unit_schema_1.UnitSchema },
                { name: log_schema_1.Log.name, schema: log_schema_1.LogSchema },
                { name: notification_schema_1.Notification.name, schema: notification_schema_1.NotificationSchema },
            ]),
        ],
        controllers: [damages_controller_1.DamagesController],
        providers: [damages_service_1.DamagesService],
        exports: [damages_service_1.DamagesService, mongoose_1.MongooseModule],
    })
], DamagesModule);
//# sourceMappingURL=damages.module.js.map