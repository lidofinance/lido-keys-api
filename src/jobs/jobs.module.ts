import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { NetworkValidationModule } from '../network-validation';
import { KeysUpdateModule } from './keys-update/keys-update.module';
import { ValidatorsUpdateModule } from './validators-update/validators-update.module';

@Module({
  imports: [NetworkValidationModule, KeysUpdateModule, ValidatorsUpdateModule],
  providers: [JobsService],
})
export class JobsModule {}
