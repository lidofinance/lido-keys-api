import { Global, Module } from '@nestjs/common';
import { ValidatorsService } from './validators.service';
import { LoggerModule } from '../common/logger';
import { ValidatorsRegistryModule } from '../validators-registry/src';

@Global()
@Module({
  imports: [LoggerModule, ValidatorsRegistryModule],
  providers: [ValidatorsService],
  exports: [ValidatorsService],
})
export class ValidatorsModule {}
