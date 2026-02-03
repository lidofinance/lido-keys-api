import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { StakingModule } from '../../interfaces/staking-module.interface';
import { STAKING_MODULE_TYPE } from '../../constants';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { StakingModuleInterfaceService } from '../staking-module-interface';
import { LidoLocatorService } from '../lido-locator';
import { BlockTag } from '../interfaces';
import { StakingRouter, STAKING_ROUTER_CONTRACT_TOKEN } from '@lido-nestjs/contracts';

// TODO: Remove this workaround after the module type is fixed in the contract
const MODULE_TYPE_OVERRIDES: Record<string, STAKING_MODULE_TYPE> = {
  '0x4d0c08f829a39456f30cbc4e41efe595fe7c4b6d': STAKING_MODULE_TYPE.CURATED_ONCHAIN_V2_TYPE,
};

@Injectable()
export class StakingRouterFetchService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly stakingModuleInterface: StakingModuleInterfaceService,
    protected readonly lidoLocatorService: LidoLocatorService,
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
    const stakingRouterAddress = await this.lidoLocatorService.getStakingRouter(blockTag);

    this.logger.log('Staking router module address', stakingRouterAddress);

    const srContract = this.getContract(stakingRouterAddress);
    const modules = await srContract.getStakingModules({ blockTag } as any);

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

        const addressLower = stakingModule.stakingModuleAddress.toLowerCase();

        // Get type from contract, but allow override for misconfigured modules
        let stakingModuleType = (await this.stakingModuleInterface.getType(
          stakingModule.stakingModuleAddress,
          blockTag,
        )) as STAKING_MODULE_TYPE;

        if (MODULE_TYPE_OVERRIDES[addressLower]) {
          this.logger.warn('Overriding staking module type', {
            stakingModuleAddress: addressLower,
            originalType: stakingModuleType,
            overriddenType: MODULE_TYPE_OVERRIDES[addressLower],
          });
          stakingModuleType = MODULE_TYPE_OVERRIDES[addressLower];
        }

        if (!stakingModuleTypeSet.has(stakingModuleType)) {
          this.logger.error(new Error(`Staking Module type ${stakingModuleType} is unknown`));
          process.exit(1);
        }

        return {
          moduleId: stakingModule.id,
          stakingModuleAddress: addressLower,
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
