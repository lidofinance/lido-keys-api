import { Module } from '@nestjs/common';
import { LoggerModule } from 'common/logger';
import { KeysUpdateModule } from 'jobs/keys-update';
import { SRModulesController } from './sr-modules.controller';
import { SRModulesService } from './sr-modules.service';

@Module({
  imports: [LoggerModule, KeysUpdateModule],
  controllers: [SRModulesController],
  providers: [SRModulesService],
})
export class SRModulesModule {}
