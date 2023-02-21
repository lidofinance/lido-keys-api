import { Global, Module } from '@nestjs/common';
import { RegistryService } from './registry.service';
import { LoggerModule } from 'common/logger';
import { JobModule } from 'common/job';
import { ExecutionProvider } from 'common/execution-provider';
import { KeyRegistryModule } from '@lido-nestjs/registry';

@Global()
@Module({
  imports: [
    LoggerModule,
    JobModule,
    KeyRegistryModule.forFeatureAsync({
      inject: [ExecutionProvider],
      async useFactory(provider) {
        return { provider };
      },
    }),
  ],
  providers: [RegistryService],
  exports: [RegistryService],
})
export class RegistryModule {}
