import { Global, Module } from '@nestjs/common';
import { ValidatorsService } from './validators.service';
import { LoggerModule } from 'common/logger';
import { JobModule } from 'common/job';
import { ValidatorsRegistryModule } from '@lido-nestjs/validators-registry';

@Global()
@Module({
  imports: [LoggerModule, JobModule, ValidatorsRegistryModule],
  providers: [ValidatorsService],
  exports: [ValidatorsService],
})
export class ValidatorsModule {}
