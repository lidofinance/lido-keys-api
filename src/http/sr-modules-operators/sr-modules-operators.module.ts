import { Module } from '@nestjs/common';
import { SRModulesOperatorsController } from './sr-modules-operators.controller';
import { SRModulesOperatorsService } from './sr-modules-operators.service';

@Module({
  controllers: [SRModulesOperatorsController],
  providers: [SRModulesOperatorsService],
})
export class SRModulesOperatorsModule {}
