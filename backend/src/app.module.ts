import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { UnitsModule } from './units/units.module';
import { DriversModule } from './drivers/drivers.module';
import { ContractsModule } from './contracts/contracts.module';
import { DamagesModule } from './damages/damages.module';
import { InspectionsModule } from './inspections/inspections.module';
import { NotificationsModule } from './notifications/notifications.module';
import { LogsModule } from './logs/logs.module';
import { ReportsModule } from './reports/reports.module';
import { UploadModule } from './upload/upload.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env.local'],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri:
          configService.get<string>('MONGODB_URI') ||
          'mongodb+srv://mons:mons@cluster0.8dgvlvp.mongodb.net/',
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    ClientsModule,
    UnitsModule,
    DriversModule,
    ContractsModule,
    DamagesModule,
    InspectionsModule,
    NotificationsModule,
    LogsModule,
    ReportsModule,
    UploadModule,
    DashboardModule,
  ],
})
export class AppModule {}
