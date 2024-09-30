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
    const prevLastChangedBlockHash = prevElMeta?.lastChangedBlockHash;
    const currentBlockHash = currElMeta.hash;

    const updaterState: UpdaterState = {
      // set prevLastChangedBlockHash as lastChangedBlockHash by default
      // further by code redefine this current variable if necessary
      lastChangedBlockHash: prevLastChangedBlockHash || currentBlockHash,
      isReorgDetected: false,
    };

    for (const contractModule of contractModules) {
      const { stakingModuleAddress } = contractModule;

      // Find implementation for staking module
      const moduleInstance = this.stakingRouterService.getStakingRouterModuleImpl(contractModule.type);
      // Read current nonce from contract
      const currNonce = await moduleInstance.getCurrentNonce(stakingModuleAddress, currentBlockHash);
      // Read module in storage
      const moduleInStorage = await this.srModulesStorage.findOneByModuleId(contractModule.moduleId);
      const prevNonce = moduleInStorage?.nonce;

      this.logger.log(`Nonce previous value: ${prevNonce}, nonce current value: ${currNonce}`);

      if (!prevBlockHash) {
        this.logger.log('No past state found, start updating', { stakingModuleAddress, currentBlockHash });

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
        this.logger.log('Nonce has been changed, start updating', {
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
        this.logger.log('Too much difference between the blocks, start updating', {
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
        this.logger.log('Reorg detected, start updating', { stakingModuleAddress, currentBlockHash });

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

      this.logger.log('No changes have been detected in the module, update is not required', {
        stakingModuleAddress,
        currentBlockHash,
        prevLastChangedBlockHash,
        lastChangedBlockHash: updaterState.lastChangedBlockHash,
      });
    }

    // Update EL meta in db
    this.logger.log('Update EL meta', {
      currentBlockHash,
      prevLastChangedBlockHash,
      lastChangedBlockHash: updaterState.lastChangedBlockHash,
    });

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
    // get full block data by hashes
    const currentBlock = await this.executionProvider.getFullBlock(currentBlockHash);
    const prevBlock = await this.executionProvider.getFullBlock(prevBlockHash);
    // prevBlock is a direct parent of currentBlock
    // there's no need to check deeper as we get the currentBlock by tag
    if (currentBlock.parentHash === prevBlock.hash) return false;
    // different hash but same number
    // is a direct indication of reorganization, there's no need to look any deeper.
    if (currentBlock.hash !== prevBlock.hash && currentBlock.number === prevBlock.number) {
      updaterState.isReorgDetected = true;
      return true;
    }
    // get all blocks by block number
    // block numbers are the interval between the current and previous blocks
    const blocks = await Promise.all(
      range(prevBlock.number, currentBlock.number + 1).map(async (bNumber) => {
        return await this.executionProvider.getFullBlock(bNumber);
      }),
    );
    // compare hash from the first block
    if (blocks[0].hash !== prevBlockHash) {
      updaterState.isReorgDetected = true;
      return true;
    }
    // compare hash from the last block
    if (blocks[blocks.length - 1].hash !== currentBlockHash) {
      updaterState.isReorgDetected = true;
      return true;
    }
    // check the integrity of the blockchain
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
