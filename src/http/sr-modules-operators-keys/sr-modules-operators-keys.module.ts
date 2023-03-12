import { Module } from '@nestjs/common';
import { LoggerModule } from 'common/logger';
import { KeysUpdateModule } from 'jobs/keys-update';
import { SRModulesOperatorsKeysController } from './sr-modules-operators-keys.controller';
import { SRModulesOperatorsKeysService } from './sr-modules-operators-keys.service';

@Module({
  imports: [LoggerModule, KeysUpdateModule],
  controllers: [SRModulesOperatorsKeysController],
  providers: [SRModulesOperatorsKeysService],
})
export class SRModulesOperatorsKeysModule {}
