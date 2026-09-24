import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UnitsService } from './units.service';
import { UnitsController } from './units.controller';
import { Unit, UnitSchema } from './schemas/unit.schema';
import { Contract, ContractSchema } from '../contracts/schemas/contract.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Unit.name, schema: UnitSchema },
      { name: Contract.name, schema: ContractSchema },
    ]),
  ],
  controllers: [UnitsController],
  providers: [UnitsService],
  exports: [UnitsService, MongooseModule],
})
export class UnitsModule {}
