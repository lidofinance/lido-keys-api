import { Module } from '@nestjs/common';
import { SRModulesOperatorsKeysController } from './sr-modules-operators-keys.controller';
import { SRModulesOperatorsKeysService } from './sr-modules-operators-keys.service';

@Module({
  controllers: [SRModulesOperatorsKeysController],
  providers: [SRModulesOperatorsKeysService],
})
export class SRModulesOperatorsKeysModule {}
