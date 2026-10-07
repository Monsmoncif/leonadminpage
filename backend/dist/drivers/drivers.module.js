"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriversModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const drivers_service_1 = require("./drivers.service");
const drivers_controller_1 = require("./drivers.controller");
const driver_schema_1 = require("./schemas/driver.schema");
const contract_schema_1 = require("../contracts/schemas/contract.schema");
const user_schema_1 = require("../users/schemas/user.schema");
let DriversModule = class DriversModule {
};
exports.DriversModule = DriversModule;
exports.DriversModule = DriversModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: driver_schema_1.Driver.name, schema: driver_schema_1.DriverSchema },
                { name: contract_schema_1.Contract.name, schema: contract_schema_1.ContractSchema },
                { name: user_schema_1.User.name, schema: user_schema_1.UserSchema },
            ]),
        ],
        controllers: [drivers_controller_1.DriversController],
        providers: [drivers_service_1.DriversService],
        exports: [drivers_service_1.DriversService, mongoose_1.MongooseModule],
    })
], DriversModule);
//# sourceMappingURL=drivers.module.js.map