import { Module } from '@nestjs/common';
import { LoggerModule } from '../../common/logger';
import { SRModulesOperatorsV2Controller } from './sr-modules-operators-v2.controller';
import { SRModulesOperatorsV2Service } from './sr-modules-operators-v2.service';

@Module({
  imports: [LoggerModule],
  controllers: [SRModulesOperatorsV2Controller],
  providers: [SRModulesOperatorsV2Service],
})
export class SRModulesOperatorsV2Module {}
