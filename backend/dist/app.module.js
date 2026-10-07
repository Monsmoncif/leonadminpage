"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const clients_module_1 = require("./clients/clients.module");
const units_module_1 = require("./units/units.module");
const drivers_module_1 = require("./drivers/drivers.module");
const contracts_module_1 = require("./contracts/contracts.module");
const damages_module_1 = require("./damages/damages.module");
const inspections_module_1 = require("./inspections/inspections.module");
const notifications_module_1 = require("./notifications/notifications.module");
const logs_module_1 = require("./logs/logs.module");
const reports_module_1 = require("./reports/reports.module");
const upload_module_1 = require("./upload/upload.module");
const dashboard_module_1 = require("./dashboard/dashboard.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ['.env', '../.env.local'],
            }),
            mongoose_1.MongooseModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: async (configService) => ({
                    uri: configService.get('MONGODB_URI') ||
                        'mongodb+srv://mons:mons@cluster0.8dgvlvp.mongodb.net/',
                }),
                inject: [config_1.ConfigService],
            }),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            clients_module_1.ClientsModule,
            units_module_1.UnitsModule,
            drivers_module_1.DriversModule,
            contracts_module_1.ContractsModule,
            damages_module_1.DamagesModule,
            inspections_module_1.InspectionsModule,
            notifications_module_1.NotificationsModule,
            logs_module_1.LogsModule,
            reports_module_1.ReportsModule,
            upload_module_1.UploadModule,
            dashboard_module_1.DashboardModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map