import { Global, Module } from '@nestjs/common';
import { ValidatorsRegistryService } from './validators-registry.service';
import { LoggerModule } from 'common/logger';
import { JobModule } from 'common/job';
import { ValidatorsRegistryModule as CLValidatorsRegistryModule } from '@lido-nestjs/validators-registry';

@Global()
@Module({
  imports: [LoggerModule, JobModule, CLValidatorsRegistryModule],
  providers: [ValidatorsRegistryService],
  exports: [ValidatorsRegistryService],
})
export class ValidatorsRegistryModule {}
