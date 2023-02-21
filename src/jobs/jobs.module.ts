import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { RegistryModule } from './registry/registry.module';
import { ValidatorsRegistryModule } from './validators-registry/validators-registry.module';

@Module({
  imports: [RegistryModule, ValidatorsRegistryModule],
  providers: [JobsService],
})
export class JobsModule {}
