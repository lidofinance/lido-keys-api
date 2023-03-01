import { Module } from '@nestjs/common';
import { LoggerModule } from 'common/logger';
import { KeysUpdateModule } from 'jobs/keys-update';
import { SRModulesValidatorsController } from './sr-modules-validators.controller';
import { SRModulesValidatorsService } from './sr-modules-validators.service';

@Module({
  imports: [LoggerModule, KeysUpdateModule],
  providers: [SRModulesValidatorsService],
  controllers: [SRModulesValidatorsController],
})
export class SRModulesValidatorsModule {}
