"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const dashboard_service_1 = require("./dashboard.service");
const dashboard_controller_1 = require("./dashboard.controller");
const unit_schema_1 = require("../units/schemas/unit.schema");
const client_schema_1 = require("../clients/schemas/client.schema");
const contract_schema_1 = require("../contracts/schemas/contract.schema");
const driver_schema_1 = require("../drivers/schemas/driver.schema");
const damage_schema_1 = require("../damages/schemas/damage.schema");
let DashboardModule = class DashboardModule {
};
exports.DashboardModule = DashboardModule;
exports.DashboardModule = DashboardModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: unit_schema_1.Unit.name, schema: unit_schema_1.UnitSchema },
                { name: client_schema_1.Client.name, schema: client_schema_1.ClientSchema },
                { name: contract_schema_1.Contract.name, schema: contract_schema_1.ContractSchema },
                { name: driver_schema_1.Driver.name, schema: driver_schema_1.DriverSchema },
                { name: damage_schema_1.Damage.name, schema: damage_schema_1.DamageSchema },
            ]),
        ],
        controllers: [dashboard_controller_1.DashboardController],
        providers: [dashboard_service_1.DashboardService],
        exports: [dashboard_service_1.DashboardService, mongoose_1.MongooseModule],
    })
], DashboardModule);
//# sourceMappingURL=dashboard.module.js.map