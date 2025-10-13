import { ThrottlerModule as ThrottlerModuleSource } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '../../../common/config';

export const ThrottlerModule = ThrottlerModuleSource.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => ({
    throttlers: [
      { ttl: configService.get('GLOBAL_THROTTLE_TTL') * 1000, limit: configService.get('GLOBAL_THROTTLE_LIMIT') },
    ],
  }),
});
