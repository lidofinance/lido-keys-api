import { Global, Module } from '@nestjs/common';
import { ValidatorsService } from './validators.service';
import { LoggerModule } from '../common/logger';
import { StorageModule, ValidatorsRegistryInterface } from '@lido-nestjs/validators-registry';
import { FilteredValidatorsRegistry } from './filtered-validators.registry';

@Global()
@Module({
  imports: [LoggerModule, StorageModule],
  providers: [
    ValidatorsService,
    // replaces the registry from @lido-nestjs/validators-registry, which fetches every validator
    { provide: ValidatorsRegistryInterface, useClass: FilteredValidatorsRegistry },
  ],
  exports: [ValidatorsService],
})
export class ValidatorsModule {}
