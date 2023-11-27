import { Module } from '@nestjs/common';
import { LoggerModule } from '../../common/logger';
import { SRModulesOperatorsKeysController } from './sr-modules-operators-keys.controller';
import { SRModulesOperatorsKeysService } from './sr-modules-operators-keys.service';

@Module({
  imports: [LoggerModule],
  controllers: [SRModulesOperatorsKeysController],
  providers: [SRModulesOperatorsKeysService],
})
export class SRModulesOperatorsKeysModule {}
