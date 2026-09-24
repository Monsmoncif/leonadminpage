import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Unit, UnitSchema } from '../units/schemas/unit.schema';
import { Client, ClientSchema } from '../clients/schemas/client.schema';
import { Contract, ContractSchema } from '../contracts/schemas/contract.schema';
import { Driver, DriverSchema } from '../drivers/schemas/driver.schema';
import { Damage, DamageSchema } from '../damages/schemas/damage.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Unit.name, schema: UnitSchema },
      { name: Client.name, schema: ClientSchema },
      { name: Contract.name, schema: ContractSchema },
      { name: Driver.name, schema: DriverSchema },
      { name: Damage.name, schema: DamageSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService, MongooseModule],
})
export class DashboardModule {}
