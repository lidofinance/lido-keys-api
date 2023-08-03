import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ELBlockSnapshot, ModuleId, SRModule } from 'http/common/entities';
import { KeyQuery } from 'http/common/entities';
import { ConfigService } from 'common/config';
import { SRModuleOperatorsKeysResponse } from './entities';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { StakingRouterService } from 'staking-router-modules/staking-router.service';
import { KeyEntity, OperatorEntity } from 'staking-router-modules/interfaces';

@Injectable()
export class SRModulesOperatorsKeysService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly configService: ConfigService,
    protected stakingRouterService: StakingRouterService,
  ) {}

  public async get(
    moduleId: ModuleId,
    filters: KeyQuery,
  ): Promise<{
    keysGenerator: AsyncGenerator<KeyEntity>;
    operators: OperatorEntity[];
    module: SRModule;
    meta: { elBlockSnapshot: ELBlockSnapshot };
  }> {
    const { operators, keysGenerator, module, elBlockSnapshot } =
      await this.stakingRouterService.getModuleOperatorsAndKeysStreamVersion(moduleId, filters);
    return { operators, keysGenerator, module, meta: { elBlockSnapshot } };
  }
}
