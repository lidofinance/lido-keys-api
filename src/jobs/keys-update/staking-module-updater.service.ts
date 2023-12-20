import { Inject, Injectable } from '@nestjs/common';
import { range } from '@lido-nestjs/utils';
import { LOGGER_PROVIDER, LoggerService } from 'common/logger';
import { StakingRouterService } from 'staking-router-modules/staking-router.service';
import { ElMetaStorageService } from 'storage/el-meta.storage';
import { ExecutionProviderService } from 'common/execution-provider';
import { SRModuleStorageService } from 'storage/sr-module.storage';
import { StakingModule, StakingModuleInterface } from 'staking-router-modules/interfaces/staking-module.interface';
import { UpdaterPayload, UpdaterState } from './keys-update.interfaces';
import { MAX_BLOCKS_OVERLAP } from './keys-update.constants';

@Injectable()
export class StakingModuleUpdaterService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected readonly stakingRouterService: StakingRouterService,
    protected readonly elMetaStorage: ElMetaStorageService,
    protected readonly executionProvider: ExecutionProviderService,
    protected readonly srModulesStorage: SRModuleStorageService,
  ) {}
  public async updateStakingModules(updaterPayload: UpdaterPayload): Promise<void> {
    const { prevElMeta, currElMeta, contractModules } = updaterPayload;
    const prevBlockHash = prevElMeta?.blockHash;
    const currentBlockHash = currElMeta.hash;

    const updaterState: UpdaterState = {
      lastChangedBlockHash: prevBlockHash || currentBlockHash,
      isReorgDetected: false,
    };

    for (const contractModule of contractModules) {
      const { stakingModuleAddress } = contractModule;

      // Find implementation for staking module
      const moduleInstance = this.stakingRouterService.getStakingRouterModuleImpl(contractModule.type);
      // Read current nonce from contract
      const currNonce = await moduleInstance.getCurrentNonce(stakingModuleAddress, currentBlockHash);
      // Read module in storage
      const moduleInStorage = await this.srModulesStorage.findOneById(contractModule.moduleId);
      const prevNonce = moduleInStorage?.nonce;

      this.logger.log(`Nonce previous value: ${prevNonce}, nonce current value: ${currNonce}`);

      if (!prevBlockHash) {
        this.logger.log('No past state found, start indexing', { stakingModuleAddress, currentBlockHash });

        await this.updateStakingModule(
          updaterState,
          moduleInstance,
          contractModule,
          stakingModuleAddress,
          currNonce,
          currentBlockHash,
        );
        continue;
      }

      if (prevNonce !== currNonce) {
        this.logger.log('Nonce has been changed, start indexing', {
          stakingModuleAddress,
          currentBlockHash,
          prevNonce,
          currNonce,
        });

        await this.updateStakingModule(
          updaterState,
          moduleInstance,
          contractModule,
          stakingModuleAddress,
          currNonce,
          currentBlockHash,
        );
        continue;
      }

      if (this.isTooMuchDiffBetweenBlocks(prevElMeta.blockNumber, currElMeta.number)) {
        this.logger.log('Too much difference between the blocks, start indexing', {
          stakingModuleAddress,
          currentBlockHash,
        });

        await this.updateStakingModule(
          updaterState,
          moduleInstance,
          contractModule,
          stakingModuleAddress,
          currNonce,
          currentBlockHash,
        );
        continue;
      }

      if (await this.isReorgDetected(updaterState, prevBlockHash, currentBlockHash)) {
        this.logger.log('Reorg detected, start indexing', { stakingModuleAddress, currentBlockHash });

        await this.updateStakingModule(
          updaterState,
          moduleInstance,
          contractModule,
          stakingModuleAddress,
          currNonce,
          currentBlockHash,
        );
        continue;
      }

      if (
        prevElMeta.blockNumber < currElMeta.number &&
        (await moduleInstance.operatorsWereChanged(
          contractModule.stakingModuleAddress,
          prevElMeta.blockNumber + 1,
          currElMeta.number,
        ))
      ) {
        this.logger.log('Update operator events happened, need to update operators', {
          stakingModuleAddress,
          currentBlockHash,
        });

        await this.updateStakingModule(
          updaterState,
          moduleInstance,
          contractModule,
          stakingModuleAddress,
          currNonce,
          currentBlockHash,
        );
        continue;
      }

      this.logger.log('No changes have been detected in the module, indexing is not required', {
        stakingModuleAddress,
        currentBlockHash,
      });
    }

    // Update EL meta in db
    await this.elMetaStorage.update({ ...currElMeta, lastChangedBlockHash: updaterState.lastChangedBlockHash });
  }

  public async updateStakingModule(
    updaterState: UpdaterState,
    moduleInstance: StakingModuleInterface,
    contractModule: StakingModule,
    stakingModuleAddress: string,
    currNonce: number,
    currentBlockHash: string,
  ) {
    await moduleInstance.update(stakingModuleAddress, currentBlockHash);
    await this.srModulesStorage.upsert(contractModule, currNonce, currentBlockHash);
    updaterState.lastChangedBlockHash = currentBlockHash;
  }

  public async isReorgDetected(updaterState: UpdaterState, prevBlockHash: string, currentBlockHash: string) {
    // calculate once per iteration
    // no need to recheck each module separately
    if (updaterState.isReorgDetected) {
      return true;
    }

    const currentBlock = await this.executionProvider.getFullBlock(currentBlockHash);
    const prevBlock = await this.executionProvider.getFullBlock(prevBlockHash);

    if (currentBlock.parentHash === prevBlock.hash) return false;
    // different hash but same number
    if (currentBlock.hash !== prevBlock.hash && currentBlock.number === prevBlock.number) {
      updaterState.isReorgDetected = true;
      return true;
    }

    const blocks = await Promise.all(
      range(prevBlock.number, currentBlock.number).map(async (bNumber) => {
        return await this.executionProvider.getFullBlock(bNumber);
      }),
    );

    for (let i = 1; i < blocks.length; i++) {
      const previousBlock = blocks[i - 1];
      const currentBlock = blocks[i];

      if (currentBlock.parentHash !== previousBlock.hash) {
        updaterState.isReorgDetected = true;
        return true;
      }
    }

    return false;
  }

  public isTooMuchDiffBetweenBlocks(prevBlockNumber: number, currentBlockNumber: number) {
    return currentBlockNumber - prevBlockNumber >= MAX_BLOCKS_OVERLAP;
  }
}
