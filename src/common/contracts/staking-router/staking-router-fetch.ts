import { StakingRouter, STAKING_ROUTER_CONTRACT_TOKEN } from '@lido-nestjs/contracts';
import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { StakingModule } from './staking-module';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { IStakingModuleService } from 'common/contracts/i-staking-module';
import { STAKING_MODULE_TYPE } from 'staking-router-modules';

@Injectable()
export class StakingRouterFetchService {
  constructor(
    @Inject(STAKING_ROUTER_CONTRACT_TOKEN) protected readonly contract: StakingRouter,
    @Inject(LOGGER_PROVIDER) protected readonly loggerService: LoggerService,
    protected readonly iStakingModule: IStakingModuleService,
  ) {}

  /**
   *
   * @returns Staking Router modules list
   */
  public async getStakingModules(blockTag: number | string): Promise<StakingModule[]> {
    const modules = await this.contract.getStakingModules({ blockTag });

    this.loggerService.debug?.(`Modules ${modules}`);

    const transformedModules = await Promise.all(
      modules.map(async (stakingModule) => {
        const isActive = this.contract.getStakingModuleIsActive(stakingModule.id, { blockTag });

        if (!isActive) {
          return null;
        }

        const stakingModuleType = (await this.iStakingModule.getType(
          stakingModule.stakingModuleAddress,
          blockTag,
        )) as STAKING_MODULE_TYPE;

        if (!Object.values(STAKING_MODULE_TYPE).includes(stakingModuleType)) {
          throw new Error(`Staking Module type ${stakingModuleType} is unknown`);
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
        };
      }),
    );

    const activeModules: StakingModule[] = transformedModules2.filter((module): module is StakingModule => !!module);

    this.loggerService.debug?.(`Staking Router modules list`, activeModules);

    return activeModules;
  }
}
