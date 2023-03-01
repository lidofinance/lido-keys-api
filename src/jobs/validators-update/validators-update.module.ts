import { Global, Module } from '@nestjs/common';
import { ValidatorsUpdateService } from './validators-update.service';
import { LoggerModule } from 'common/logger';
import { JobModule } from 'common/job';

@Global()
@Module({
  imports: [LoggerModule, JobModule],
  providers: [ValidatorsUpdateService],
  exports: [ValidatorsUpdateService],
})
export class ValidatorsUpdateModule {}
