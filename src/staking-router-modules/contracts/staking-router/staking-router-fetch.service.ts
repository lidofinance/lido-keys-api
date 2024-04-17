import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { StakingModule } from '../../interfaces/staking-module.interface';
import { STAKING_MODULE_TYPE } from '../../constants';
import { LOGGER_PROVIDER } from '@catalist-nestjs/logger';
import { StakingModuleInterfaceService } from '../staking-module-interface';
import { CatalistLocatorService } from '../catalist-locator';
import { BlockTag } from '../interfaces';
import { StakingRouter, STAKING_ROUTER_CONTRACT_TOKEN } from '@catalist-nestjs/contracts';

@Injectable()
export class StakingRouterFetchService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly stakingModuleInterface: StakingModuleInterfaceService,
    protected readonly catalistLocatorService: CatalistLocatorService,
    @Inject(STAKING_ROUTER_CONTRACT_TOKEN) protected readonly contract: StakingRouter,
  ) {}

  private getContract(contractAddress: string) {
    return this.contract.attach(contractAddress);
  }

  /**
   *
   * @returns Staking modules list
   */
  public async getStakingModules(blockTag: BlockTag): Promise<StakingModule[]> {
    const stakingRouterAddress = await this.catalistLocatorService.getStakingRouter(blockTag);

    this.logger.log('Staking router module address', stakingRouterAddress);

    const srContract = this.getContract(stakingRouterAddress);
    const modules = await srContract.getStakingModules({ blockTag } as any);

    this.logger.log(`Fetched ${modules.length} modules`);
    this.logger.log('Staking modules', modules);

    const transformedModules = await Promise.all(
      modules.map(async (stakingModule) => {
        // TODO: what is the diff between status and active ?
        const isActive = await srContract.getStakingModuleIsActive(stakingModule.id, { blockTag } as any);

        const stakingModuleType = (await this.stakingModuleInterface.getType(
          stakingModule.stakingModuleAddress,
          blockTag,
        )) as STAKING_MODULE_TYPE;

        // TODO: reconsider way of checking this module type
        if (!Object.values(STAKING_MODULE_TYPE).includes(stakingModuleType)) {
          this.logger.error(new Error(`Staking Module type ${stakingModuleType} is unknown`));
          process.exit(1);
        }

        return {
          moduleId: stakingModule.id,
          stakingModuleAddress: stakingModule.stakingModuleAddress.toLowerCase(),
          moduleFee: stakingModule.stakingModuleFee,
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
