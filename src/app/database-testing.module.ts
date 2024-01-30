import { DynamicModule, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import config from 'mikro-orm.config';
import { ConfigModule, ConfigService } from 'common/config';

@Module({})
export class DatabaseTestingModule {
  static forRoot(mikroOrmConfigOverrides: Partial<typeof config> = {}): DynamicModule {
    return {
      module: DatabaseTestingModule,
      imports: [
        ConfigModule,
        MikroOrmModule.forRootAsync({
          async useFactory(configService: ConfigService) {
            return {
              ...config,
              ...mikroOrmConfigOverrides,
              dbName: configService.get('DB_NAME'),
              host: configService.get('DB_HOST'),
              port: configService.get('DB_PORT'),
              user: configService.get('DB_USER'),
              password: configService.get('DB_PASSWORD'),
              autoLoadEntities: false,
              cache: { enabled: false },
              debug: false,
              registerRequestContext: true,
              allowGlobalContext: true,
            };
          },
          inject: [ConfigService],
        }),
      ],
    };
  }
}
