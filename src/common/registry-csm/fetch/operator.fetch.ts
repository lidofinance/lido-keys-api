/* eslint-disable @typescript-eslint/no-explicit-any */
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { rangePromise } from '@lido-nestjs/utils';
import { Csm } from 'generated';
import { CSM_CONTRACT_TOKEN, ContractFactoryFn } from 'common/contracts';
import { CallOverrides } from './interfaces/overrides.interface';
import { RegistryOperator } from './interfaces/operator.interface';
import { REGISTRY_OPERATORS_BATCH_SIZE } from './operator.constants';
import { OPERATOR_NAME_RESOLVERS_TOKEN, OperatorNameResolversConfig } from './operator-name-resolver';
import { ModuleTypeRegistry } from 'common/module-type-registry';
import { utils } from 'ethers';

@Injectable()
export class RegistryOperatorFetchService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected logger: LoggerService,
    @Inject(CSM_CONTRACT_TOKEN) private connectCsm: ContractFactoryFn<Csm>,
    @Inject(OPERATOR_NAME_RESOLVERS_TOKEN) private resolvers: OperatorNameResolversConfig,
    private readonly moduleTypeRegistry: ModuleTypeRegistry,
  ) {}

  private async resolveOperatorName(
    moduleAddress: string,
    operatorIndex: number,
    overrides: CallOverrides,
  ): Promise<string> {
    const type = this.moduleTypeRegistry.get(moduleAddress);
    if (!type) {
      this.logger.error(
        `Type for module ${moduleAddress} is not warmed up in ModuleTypeRegistry. Requested operator index: ${operatorIndex}.`,
      );
      throw new Error(
        `ModuleTypeRegistry has no entry for ${moduleAddress}. ` +
          `It must be populated before calling operator fetch.`,
      );
    }

    const resolver = this.resolvers[type];
    if (!resolver) {
      this.logger.error(
        `No operator name resolver configured for type ${type} of module ${moduleAddress}. Supported types: ${Object.keys(
          this.resolvers,
        ).join(', ')}.`,
      );
      throw new Error(
        `No operator name resolver for module type "${type}" at ${moduleAddress}. ` +
          `CSM operator fetch supports only COMMUNITY_ONCHAIN_V1 and CURATED_ONCHAIN_V2.`,
      );
    }

    return resolver.resolve(moduleAddress, operatorIndex, overrides);
  }

  /**
   * Exits early if relevant events are found, as they are used only as indicators for an update.
   */
  private async fetchOperatorsEvents(moduleAddress: string, fromBlock: number, toBlock: number) {
    if (fromBlock > toBlock) {
      return [];
    }

    const events = await this.connectCsm(moduleAddress).provider.getLogs({
      topics: [
        [
          // KECCAK256 hash of the text bytes
          utils.id('NodeOperatorRewardAddressChanged(uint256,address,address)'),
        ],
      ],
      fromBlock,
      toBlock,
    });

    return events;
  }

  public async operatorsWereChanged(moduleAddress: string, fromBlock: number, toBlock: number): Promise<boolean> {
    const events = await this.fetchOperatorsEvents(moduleAddress, fromBlock, toBlock);

    return events.length > 0;
  }

  /** return blockTag for finalized block, it need for testing purposes */
  public getFinalizedBlockTag() {
    return 'finalized';
  }

  /** fetches number of operators */
  public async count(moduleAddress: string, overrides: CallOverrides = {}): Promise<number> {
    const bigNumber = await this.connectCsm(moduleAddress).getNodeOperatorsCount(overrides as any);
    return bigNumber.toNumber();
  }

  /**
   * fetches finalized operator
   * @param moduleAddress address of sr module
   * @param operatorIndex index of sr module operator
   * @returns used signing keys count, if error happened returns 0 (because of range error)
   */
  public async getFinalizedNodeOperatorUsedSigningKeys(moduleAddress: string, operatorIndex: number): Promise<number> {
    const contract = this.connectCsm(moduleAddress);
    try {
      const { totalDepositedKeys } = await contract.getNodeOperator(operatorIndex, {
        blockTag: this.getFinalizedBlockTag(),
      });

      return totalDepositedKeys;
    } catch (error) {
      this.logger.warn(
        `an error occurred while trying to load the finalized state for operator ${operatorIndex} from module ${moduleAddress}`,
        error,
      );
      return 0;
    }
  }

  /** fetches one operator */
  public async fetchOne(
    moduleAddress: string,
    operatorIndex: number,
    overrides: CallOverrides = {},
  ): Promise<RegistryOperator> {
    const contract = this.connectCsm(moduleAddress);

    const [operator, summary, finalizedUsedSigningKeys, name] = await Promise.all([
      contract.getNodeOperator(operatorIndex, overrides as any),
      contract.getNodeOperatorSummary(operatorIndex, overrides as any),
      this.getFinalizedNodeOperatorUsedSigningKeys(moduleAddress, operatorIndex),
      this.resolveOperatorName(moduleAddress, operatorIndex, overrides),
    ]);

    const { rewardAddress, totalAddedKeys, totalExitedKeys, totalDepositedKeys, totalVettedKeys } = operator;

    // There is no concept of "active/inactive" operator in CSM.
    // The method `getNodeOperatorIsActive` only checks if the operator's ID exists (ID < count).
    // We fetch operators with IDs < count, so here we can just set `active` to true.
    const active = true;

    return {
      index: operatorIndex,
      active,
      name,
      rewardAddress,
      stakingLimit: totalVettedKeys,
      stoppedValidators: totalExitedKeys,
      totalSigningKeys: totalAddedKeys,
      usedSigningKeys: totalDepositedKeys,
      moduleAddress,
      finalizedUsedSigningKeys,
      depositableValidatorsCount: summary.depositableValidatorsCount.toNumber(),
    };
  }

  /** fetches operators */
  public async fetch(
    moduleAddress: string,
    fromIndex = 0,
    toIndex = -1,
    overrides: CallOverrides = {},
  ): Promise<RegistryOperator[]> {
    if (fromIndex > toIndex && toIndex !== -1) {
      throw new Error('fromIndex is greater than or equal to toIndex');
    }

    if (toIndex == null || toIndex === -1) {
      toIndex = await this.count(moduleAddress, overrides);
    }

    const fetcher = async (operatorIndex: number) => {
      return await this.fetchOne(moduleAddress, operatorIndex, overrides);
    };

    const batchSize = REGISTRY_OPERATORS_BATCH_SIZE;

    return await rangePromise(fetcher, fromIndex, toIndex, batchSize);
  }
}
