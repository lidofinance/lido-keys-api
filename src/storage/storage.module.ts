import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Global, Module } from '@nestjs/common';
import { ElMetaEntity } from './el-meta.entity';
import { ElMetaStorageService } from './el-meta.storage';
import { SrModuleEntity } from './sr-module.entity';
import { SRModuleStorageService } from './sr-module.storage';
import { AppInfoEntity } from './app-info.entity';
import { AppInfoStorageService } from './app-info.storage';

@Global()
@Module({
  imports: [
    MikroOrmModule.forFeature({
      entities: [SrModuleEntity, ElMetaEntity, AppInfoEntity],
    }),
  ],
  providers: [SRModuleStorageService, ElMetaStorageService, AppInfoStorageService],
  exports: [SRModuleStorageService, ElMetaStorageService, AppInfoStorageService],
})
export class StorageModule {}
