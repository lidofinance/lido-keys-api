import { Module } from '@nestjs/common';
import { LoggerModule } from 'common/logger';
import { SRModulesValidatorsController } from './sr-modules-validators.controller';
import { SRModulesValidatorsService } from './sr-modules-validators.service';

@Module({
  imports: [LoggerModule],
  controllers: [SRModulesValidatorsController],
  providers: [SRModulesValidatorsService],
})
export class SRModulesValidatorsModule {}
