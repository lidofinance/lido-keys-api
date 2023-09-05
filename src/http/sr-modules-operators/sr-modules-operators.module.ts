import { Module } from '@nestjs/common';
import { LoggerModule } from 'common/logger';
import { SRModulesOperatorsController } from './sr-modules-operators.controller';
import { SRModulesOperatorsService } from './sr-modules-operators.service';

@Module({
  imports: [LoggerModule],
  controllers: [SRModulesOperatorsController],
  providers: [SRModulesOperatorsService],
})
export class SRModulesOperatorsModule {}
