import { Module } from '@nestjs/common';
import { LoggerModule } from 'common/logger';
import { KeysUpdateModule } from 'jobs/keys-update';
import { SRModulesKeysController } from './sr-modules-keys.controller';
import { SRModulesKeysService } from './sr-modules-keys.service';

@Module({
  imports: [LoggerModule, KeysUpdateModule],
  controllers: [SRModulesKeysController],
  providers: [SRModulesKeysService],
})
export class SRModulesKeysModule {}
