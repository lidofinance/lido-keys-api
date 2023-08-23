import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { StakingModule } from '../../interfaces/staking-module.interface';
import { STAKING_MODULE_TYPE } from '../../constants';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { StakingModuleInterfaceService } from '../staking-module-interface';
import { LidoLocatorService } from '../lido-locator';
// TODO: maybe we need to move generated to the same folder with contracts
import { StakingRouter__factory } from '../../../generated';
// TODO: maybe ../../../ shows us that we need to move execution-provider on level up
import { ExecutionProvider } from '../../../common/execution-provider';
import { BlockTag } from '../interfaces';
// TODO: maybe it is time to stop using trace decorators in code and use it only in debug mode
import { Trace } from '../../../common/decorators/trace';

const TRACE_TIMEOUT = 30 * 1000;

@Injectable()
export class StakingRouterFetchService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly stakingModuleInterface: StakingModuleInterfaceService,
    protected readonly lidoLocatorService: LidoLocatorService,
    protected readonly provider: ExecutionProvider,
  ) {}

  private getSRContract(contractAddress: string) {
    // TODO: use attach instead
    return StakingRouter__factory.connect(contractAddress, this.provider);
  }

  /**
   *
   * @returns Staking Router modules list
   */
  @Trace(TRACE_TIMEOUT)
  public async getStakingModules(blockTag: BlockTag): Promise<StakingModule[]> {
    const stakingRouterAddress = await this.lidoLocatorService.getStakingRouter(blockTag);

    this.logger.log('Staking router module address', stakingRouterAddress);

    const srContract = this.getSRContract(stakingRouterAddress);
    const modules = await srContract.getStakingModules({ blockTag } as any);

    this.logger.log(`Fetched ${modules.length} modules`);
    this.logger.log('Staking modules', modules);

    const transformedModules = await Promise.all(
      modules.map(async (stakingModule) => {
        const isActive = await srContract.getStakingModuleIsActive(stakingModule.id, { blockTag } as any);

        const stakingModuleType = (await this.stakingModuleInterface.getType(
          stakingModule.stakingModuleAddress,
          blockTag,
        )) as STAKING_MODULE_TYPE;

        // TODO: reconsider way of checking this module type without
        // TODO: how to handle this case?
        if (!Object.values(STAKING_MODULE_TYPE).includes(stakingModuleType)) {
          this.logger.error(new Error(`Staking Module type ${STAKING_MODULE_TYPE} is unknown`));
          process.exit(1);
        }

        return {
          id: stakingModule.id,
          stakingModuleAddress: stakingModule.stakingModuleAddress,
          stakingModuleFee: stakingModule.stakingModuleFee,
          treasuryFee: stakingModule.treasuryFee,
          targetShare: stakingModule.targetShare,
          status: stakingModule.status,
          name: stakingModule.name,
          type: stakingModuleType,
          lastDepositAt: stakingModule.lastDepositAt.toNumber(),
          lastDepositBlock: stakingModule.lastDepositBlock.toNumber(),
          exitedValidatorsCount: stakingModule.exitedValidatorsCount.toNumber(),
          active: isActive,
        };
      }),
    );

    return transformedModules;
  }
}
