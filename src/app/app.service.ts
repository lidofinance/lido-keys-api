import { Inject, Injectable, LoggerService, OnModuleInit } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@catalist-nestjs/logger';
import { ExecutionProviderService } from '../common/execution-provider';
import { ConsensusProviderService } from '../common/consensus-provider';
import { ConfigService } from '../common/config';
import { PrometheusService } from '../common/prometheus';
import { APP_NAME, APP_VERSION } from './app.constants';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly executionProviderService: ExecutionProviderService,
    protected readonly consensusProviderService: ConsensusProviderService,
    protected readonly configService: ConfigService,
    protected readonly prometheusService: PrometheusService,
  ) {}

  public async onModuleInit(): Promise<void> {
    if (this.configService.get('VALIDATOR_REGISTRY_ENABLE')) {
      await this.validateNetwork();
    }

    const env = this.configService.get('NODE_ENV');
    const version = APP_VERSION;
    const name = APP_NAME;
    const network = await this.executionProviderService.getNetworkName();
    this.prometheusService.buildInfo.labels({ env, name, version, network }).inc();
    this.logger.log('Init app', { env, name, version });
  }

  /**
   * Validates the CL and EL chains match
   */
  protected async validateNetwork(): Promise<void> {
    const chainId = this.configService.get('CHAIN_ID');
    const depositContract = await this.consensusProviderService.getDepositContract();
    const elChainId = await this.executionProviderService.getChainId();
    const clChainId = Number(depositContract.data?.chain_id);

    if (chainId !== elChainId || elChainId !== clChainId) {
      throw new Error('Execution and consensus chain ids do not match');
    }
  }
}
