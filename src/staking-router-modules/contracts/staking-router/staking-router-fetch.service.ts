import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { StakingModule } from '../../interfaces/staking-module.interface';
import { STAKING_MODULE_TYPE } from '../../constants';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { StakingModuleInterfaceService } from '../staking-module-interface';
import { LidoLocatorService } from '../lido-locator';
import { BlockTag } from '../interfaces';
import { StakingRouter } from 'generated';
import { STAKING_ROUTER_CONTRACT_TOKEN, ContractFactoryFn } from 'common/contracts';

@Injectable()
export class StakingRouterFetchService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly stakingModuleInterface: StakingModuleInterfaceService,
    protected readonly lidoLocatorService: LidoLocatorService,
    @Inject(STAKING_ROUTER_CONTRACT_TOKEN)
    protected readonly connectStakingRouter: ContractFactoryFn<StakingRouter>,
  ) {}

  /**
   *
   * @returns Staking modules list
   */
  public async getStakingModules(blockTag: BlockTag): Promise<StakingModule[]> {
    const stakingRouterAddress = await this.lidoLocatorService.getStakingRouter(blockTag);

    this.logger.log('Staking router module address', stakingRouterAddress);

    const contract = this.connectStakingRouter(stakingRouterAddress);
    const modules = await contract.getStakingModules({ blockTag } as any);

    this.logger.log('Fetched staking modules', { stakingModules: modules.length });

    const stakingModuleTypeSet = new Set(Object.values(STAKING_MODULE_TYPE));

    const transformedModules = await Promise.all(
      modules.map(async (stakingModule) => {
        const isActive = stakingModule.status === 0;

        if (!isActive) {
          this.logger.warn('Staking module is not active', {
            stakingModuleAddress: stakingModule.stakingModuleAddress,
            stakingModuleId: stakingModule.id,
            status: stakingModule.status,
          });
        }

        const stakingModuleType = (await this.stakingModuleInterface.getType(
          stakingModule.stakingModuleAddress,
          blockTag,
        )) as STAKING_MODULE_TYPE;

        if (!stakingModuleTypeSet.has(stakingModuleType)) {
          this.logger.error(new Error(`Staking Module type ${stakingModuleType} is unknown`));
          process.exit(1);
        }

        return {
          moduleId: stakingModule.id,
          stakingModuleAddress: stakingModule.stakingModuleAddress.toLowerCase(),
          moduleFee: stakingModule.stakingModuleFee,
          treasuryFee: stakingModule.treasuryFee,
          targetShare: stakingModule.stakeShareLimit,
          status: stakingModule.status,
          name: stakingModule.name,
          type: stakingModuleType,
          lastDepositAt: stakingModule.lastDepositAt.toNumber(),
          lastDepositBlock: stakingModule.lastDepositBlock.toNumber(),
          exitedValidatorsCount: stakingModule.exitedValidatorsCount.toNumber(),
          active: isActive,
          // withdrawalCredentialsType: stakingModule.withdrawalCredentialsType,
        };
      }),
    );

    return transformedModules;
  }
}
