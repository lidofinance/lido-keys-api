import { Module } from '@nestjs/common';
import { PrometheusModule } from '../common/prometheus';
import { ConfigModule, ConfigService } from '../common/config';
import { ConsensusProviderModule } from '../common/consensus-provider';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ScheduleModule } from '@nestjs/schedule';
import config from '../mikro-orm.config';
import { LoggerModule } from '@lido-nestjs/logger';
import { ValidatorsUpdateModule } from 'jobs/validators-update';
import { ValidatorsModule } from 'validators';

@Module({
  imports: [
    PrometheusModule,
    LoggerModule,
    ConfigModule,
    ConsensusProviderModule,
    MikroOrmModule.forRootAsync({
      async useFactory(configService: ConfigService) {
        return {
          ...config,
          dbName: configService.get('DB_NAME'),
          host: configService.get('DB_HOST'),
          port: configService.get('DB_PORT'),
          user: configService.get('DB_USER'),
          password: configService.get('DB_PASSWORD'),
          autoLoadEntities: false,
          cache: { enabled: false },
          debug: false,
          registerRequestContext: true,
          allowGlobalContext: false,
        };
      },
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    ValidatorsModule,
    ValidatorsUpdateModule,
  ],
  providers: [],
})
export class WorkerAppModule {}
