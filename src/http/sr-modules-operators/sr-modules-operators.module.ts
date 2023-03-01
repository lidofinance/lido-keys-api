import { Module } from '@nestjs/common';
import { LoggerModule } from 'common/logger';
import { KeysUpdateModule } from 'jobs/keys-update';
import { SRModulesOperatorsController } from './sr-modules-operators.controller';
import { SRModulesOperatorsService } from './sr-modules-operators.service';

@Module({
  imports: [LoggerModule, KeysUpdateModule],
  controllers: [SRModulesOperatorsController],
  providers: [SRModulesOperatorsService],
})
export class SRModulesOperatorsModule {}
