import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { Contract, ContractSchema } from './schemas/contract.schema';
import { Client, ClientSchema } from '../clients/schemas/client.schema';
import { Unit, UnitSchema } from '../units/schemas/unit.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Damage, DamageSchema } from '../damages/schemas/damage.schema';
import { Inspection, InspectionSchema } from '../inspections/schemas/inspection.schema';
import { Notification, NotificationSchema } from '../notifications/schemas/notification.schema';
import { Log, LogSchema } from '../logs/schemas/log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Contract.name, schema: ContractSchema },
      { name: Client.name, schema: ClientSchema },
      { name: Unit.name, schema: UnitSchema },
      { name: User.name, schema: UserSchema },
      { name: Damage.name, schema: DamageSchema },
      { name: Inspection.name, schema: InspectionSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: Log.name, schema: LogSchema },
    ]),
  ],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService, MongooseModule],
})
export class ContractsModule {}
