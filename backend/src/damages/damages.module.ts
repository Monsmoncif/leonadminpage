import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DamagesService } from './damages.service';
import { DamagesController } from './damages.controller';
import { Damage, DamageSchema } from './schemas/damage.schema';
import { Contract, ContractSchema } from '../contracts/schemas/contract.schema';
import { Unit, UnitSchema } from '../units/schemas/unit.schema';
import { Log, LogSchema } from '../logs/schemas/log.schema';
import { Notification, NotificationSchema } from '../notifications/schemas/notification.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Damage.name, schema: DamageSchema },
      { name: Contract.name, schema: ContractSchema },
      { name: Unit.name, schema: UnitSchema },
      { name: Log.name, schema: LogSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
  ],
  controllers: [DamagesController],
  providers: [DamagesService],
  exports: [DamagesService, MongooseModule],
})
export class DamagesModule {}
