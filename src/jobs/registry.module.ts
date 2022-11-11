import { Global, Module } from '@nestjs/common';
import { RegistryService } from './registry.service';
import { LoggerModule } from 'common/logger';
import { JobModule } from 'common/job';

@Global()
@Module({
  imports: [LoggerModule, JobModule],
  providers: [RegistryService],
  exports: [RegistryService],
})
export class RegistryModule {}
