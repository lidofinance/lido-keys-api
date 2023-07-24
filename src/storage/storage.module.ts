import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Global, Module } from '@nestjs/common';
import { ElMetaEntity } from './el-meta.entity';
import { ElMetaStorageService } from './el-meta.storage';
import { SRModuleEntity } from './sr-module.entity';
import { SRModuleStorageService } from './sr-module.storage';

@Global()
@Module({
  imports: [
    MikroOrmModule.forFeature({
      entities: [SRModuleEntity, ElMetaEntity],
    }),
  ],
  providers: [SRModuleStorageService, ElMetaStorageService],
  exports: [SRModuleStorageService, ElMetaStorageService],
})
export class StorageModule {}
