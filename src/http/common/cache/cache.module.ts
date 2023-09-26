import { CacheModule as CacheModuleSource } from '@nestjs/common';
import { ConfigModule, ConfigService } from '../../../common/config';

export const CacheModule = CacheModuleSource.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => ({
    ttl: configService.get('GLOBAL_CACHE_TTL'),
  }),
});
