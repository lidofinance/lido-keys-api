import { Module } from '@nestjs/common';
import { LoggerModule } from '../../common/logger';
import { SRModulesCompoundingOperatorsController } from './sr-modules-compounding-operators.controller';
import { SRModulesCompoundingOperatorsService } from './sr-modules-compounding-operators.service';

@Module({
  imports: [LoggerModule],
  controllers: [SRModulesCompoundingOperatorsController],
  providers: [SRModulesCompoundingOperatorsService],
})
export class SRModulesCompoundingOperatorsModule {}
