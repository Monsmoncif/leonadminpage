"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const contracts_service_1 = require("./contracts.service");
const contracts_controller_1 = require("./contracts.controller");
const contract_schema_1 = require("./schemas/contract.schema");
const client_schema_1 = require("../clients/schemas/client.schema");
const unit_schema_1 = require("../units/schemas/unit.schema");
const user_schema_1 = require("../users/schemas/user.schema");
const damage_schema_1 = require("../damages/schemas/damage.schema");
const inspection_schema_1 = require("../inspections/schemas/inspection.schema");
const notification_schema_1 = require("../notifications/schemas/notification.schema");
const log_schema_1 = require("../logs/schemas/log.schema");
let ContractsModule = class ContractsModule {
};
exports.ContractsModule = ContractsModule;
exports.ContractsModule = ContractsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: contract_schema_1.Contract.name, schema: contract_schema_1.ContractSchema },
                { name: client_schema_1.Client.name, schema: client_schema_1.ClientSchema },
                { name: unit_schema_1.Unit.name, schema: unit_schema_1.UnitSchema },
                { name: user_schema_1.User.name, schema: user_schema_1.UserSchema },
                { name: damage_schema_1.Damage.name, schema: damage_schema_1.DamageSchema },
                { name: inspection_schema_1.Inspection.name, schema: inspection_schema_1.InspectionSchema },
                { name: notification_schema_1.Notification.name, schema: notification_schema_1.NotificationSchema },
                { name: log_schema_1.Log.name, schema: log_schema_1.LogSchema },
            ]),
        ],
        controllers: [contracts_controller_1.ContractsController],
        providers: [contracts_service_1.ContractsService],
        exports: [contracts_service_1.ContractsService, mongoose_1.MongooseModule],
    })
], ContractsModule);
//# sourceMappingURL=contracts.module.js.map