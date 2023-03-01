import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { KeysUpdateModule } from './keys-update/keys-update.module';
import { ValidatorsUpdateModule } from './validators-update/validators-update.module';

@Module({
  imports: [KeysUpdateModule, ValidatorsUpdateModule],
  providers: [JobsService],
})
export class JobsModule {}
