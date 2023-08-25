import { ThrottlerModule as ThrottlerModuleSource } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '../../../common/config';

export const ThrottlerModule = ThrottlerModuleSource.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => ({
    ttl: configService.get('GLOBAL_THROTTLE_TTL'),
    limit: configService.get('GLOBAL_THROTTLE_LIMIT'),
  }),
});
