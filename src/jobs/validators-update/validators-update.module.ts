import { Global, Module } from '@nestjs/common';
import { ValidatorsUpdateService } from './validators-update.service';
import { JobModule } from 'common/job';

@Global()
@Module({
  imports: [JobModule],
  providers: [ValidatorsUpdateService],
  exports: [ValidatorsUpdateService],
})
export class ValidatorsUpdateModule {}
