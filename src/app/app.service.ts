import { Inject, Injectable, LoggerService, OnModuleInit } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { ExecutionProviderService } from '../common/execution-provider';
import { ConfigService } from '../common/config';
import { PrometheusService } from '../common/prometheus';
import { APP_NAME, APP_VERSION } from './app.constants';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly executionProviderService: ExecutionProviderService,
    protected readonly configService: ConfigService,
    protected readonly prometheusService: PrometheusService,
  ) {}

  public async onModuleInit(): Promise<void> {
    const env = this.configService.get('NODE_ENV');
    const version = APP_VERSION;
    const name = APP_NAME;
    const network = await this.executionProviderService.getNetworkName();
    this.prometheusService.buildInfo.labels({ env, name, version, network }).inc();
    this.logger.log('Init app', { env, name, version, network });
  }
}
