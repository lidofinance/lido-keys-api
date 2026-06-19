import { Global, Module } from '@nestjs/common';
import { ModuleTypeRegistry } from './module-type.registry';

@Global()
@Module({
  providers: [ModuleTypeRegistry],
  exports: [ModuleTypeRegistry],
})
export class ModuleTypeRegistryModule {}
