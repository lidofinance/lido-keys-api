import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Global, Module } from '@nestjs/common';
import { SRModuleEntity } from './sr-module.entity';
import { SRModuleStorageService } from './sr-module.storage';

@Global()
@Module({
  imports: [
    MikroOrmModule.forFeature({
      entities: [SRModuleEntity],
    }),
  ],
  providers: [SRModuleStorageService],
  exports: [SRModuleStorageService],
})
export class StorageModule {}
