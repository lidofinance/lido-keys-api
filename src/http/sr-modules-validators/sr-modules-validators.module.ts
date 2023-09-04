import { Module } from '@nestjs/common';
import { LoggerModule } from 'common/logger';
import { ValidatorsModule } from 'validators';
import { SRModulesValidatorsController } from './sr-modules-validators.controller';
import { SRModulesValidatorsService } from './sr-modules-validators.service';

@Module({
  imports: [LoggerModule, ValidatorsModule],
  providers: [SRModulesValidatorsService],
  controllers: [SRModulesValidatorsController],
})
export class SRModulesValidatorsModule {}
