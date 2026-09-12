import { Module } from '@nestjs/common';
import { NetworkValidationService } from './network-validation.service';

@Module({
  providers: [NetworkValidationService],
  exports: [NetworkValidationService],
})
export class NetworkValidationModule {}
