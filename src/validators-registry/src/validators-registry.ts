import { Injectable } from '@nestjs/common';
import { ConsensusModule, ConsensusService } from '@lido-nestjs/consensus';
import { ValidatorsRegistryInterface, BlockId } from './interfaces';
import { BlockHeader, Validator, ConsensusMeta, ConsensusValidatorsAndMetadata, Slot } from './types';
import { FindOptions, FilterQuery, StorageServiceInterface } from './storage';
import { parseAsTypeOrFail, calcEpochBySlot } from './utils';
import { ConsensusDataInvalidError } from './errors';
import { ConsensusValidatorEntity } from './storage/consensus-validator.entity';
import { EntityManager } from '@mikro-orm/knex';
import { IsolationLevel } from '@mikro-orm/core';
import * as Pick from 'stream-json/filters/Pick';
import * as StreamValues from 'stream-json/streamers/StreamValues';
import * as StreamArray from 'stream-json/streamers/StreamArray';

import { chain } from 'stream-chain';
import { parser } from 'stream-json';
import { pick } from 'stream-json/filters/Pick';
import { streamArray } from 'stream-json/streamers/StreamArray';
import { batch } from 'stream-json/utils/Batch';

async function* chunkStream(sourceStream, chunkSize) {
  console.log('i amhere!!!');
  let chunk: any[] = [];
  for await (const item of sourceStream) {
    chunk.push(item);
    if (chunk.length === chunkSize) {
      yield chunk;
      chunk = [];
    }
  }
  if (chunk.length > 0) {
    console.log('next yield!');
    yield chunk;
  }
}

@Injectable()
export class ValidatorsRegistry implements ValidatorsRegistryInterface {
  public constructor(
    protected readonly consensusService: ConsensusService,
    protected readonly storageService: StorageServiceInterface,
  ) {}

  /**
   * @inheritDoc
   */
  public async getMeta(): Promise<ConsensusMeta | null> {
    return this.storageService.getConsensusMeta();
  }

  /**
   * @inheritDoc
   */
  public async getValidators(
    pubkeys?: string[],
    where?: FilterQuery<ConsensusValidatorEntity>,
    options?: FindOptions<ConsensusValidatorEntity>,
  ): Promise<ConsensusValidatorsAndMetadata> {
    return this.storageService.getValidatorsAndMeta(pubkeys, where, options);
  }

  protected isNewDataInConsensus(previousMeta: ConsensusMeta, currentBlockHeader: BlockHeader): boolean {
    return previousMeta.slot < currentBlockHeader.slot;
  }

  /**
   * @inheritDoc
   */
  public async update(blockId: BlockId): Promise<ConsensusMeta> {
    const previousMeta = await this.storageService.getConsensusMeta();
    const blockHeader = await this.getSlotHeaderFromConsensus(blockId);

    if (previousMeta && !this.isNewDataInConsensus(previousMeta, blockHeader)) {
      return previousMeta;
    }

    const consensusMeta = await this.getConsensusMetaFromConsensus(blockHeader.root);

    const validators = await this.getValidatorsFromConsensus(consensusMeta.slotStateRoot);

    await this.storageService.updateValidatorsAndMeta(validators, consensusMeta);

    return consensusMeta;
  }

  public async updateFromStream(blockId: BlockId): Promise<ConsensusMeta> {
    const previousMeta = await this.storageService.getConsensusMeta();
    const blockHeader = await this.getSlotHeaderFromConsensus(blockId);

    if (previousMeta && !this.isNewDataInConsensus(previousMeta, blockHeader)) {
      return previousMeta;
    }

    const consensusMeta = await this.getConsensusMetaFromConsensus(blockHeader.root);

    const em: EntityManager = this.storageService.getEntityManager();

    console.time('execution-time');

    await em.transactional(
      async () => {
        const validators: NodeJS.ReadableStream = await this.getValidatorsFromConsensusStream(
          consensusMeta.slotStateRoot,
        );

        await this.storageService.deleteValidators();
        await this.storageService.updateMeta(consensusMeta);

        await this.parseWriteValidators(validators);
        // let chunk: Validator[] = [];
        // // make
        // const chunkLimit = 20000;
        // // let count = 0;
        // let chunkNumber = 0;

        // // diff streamValues and streamArray
        // const validatorsData = validators.pipe(Pick.withParser({ filter: 'data' })).pipe(StreamArray.streamArray());

        // const chunks = chunkStream(validatorsData, chunkLimit);

        // for await (const chunkData of chunks) {
        //   console.log('next chunk');
        //   for (const validator of chunkData) {
        //     // console.log(next)
        //     const parsedValidator = parseAsTypeOrFail(
        //       Validator,
        //       {
        //         pubkey: validator.value?.validator?.pubkey,
        //         index: validator.value?.index,
        //         status: validator.value?.status,
        //       },
        //       (error) => {
        //         throw new ConsensusDataInvalidError(`Got invalid validators`, error);
        //       },
        //     );
        //     chunk.push(parsedValidator);
        //   }

        //   console.log('chunk count', chunk.length);
        //   await this.storageService.updateValidators(chunk);
        //   chunk = [];
        //   console.log('chunkNumber', chunkNumber);
        //   chunkNumber++;
        // }

        // if (chunk.length > 0) {
        //   await this.storageService.updateValidators(chunk);
        // }
      },
      { isolationLevel: IsolationLevel.READ_COMMITTED },
    );

    console.timeEnd('execution-time');

    return consensusMeta;
  }

  async unblock() {
    // Unblock event loop in long loops
    // Source: https://snyk.io/blog/nodejs-how-even-quick-async-functions-can-block-the-event-loop-starve-io/
    return new Promise((resolve) => {
      return setImmediate(() => resolve(true));
    });
  }

  public async parseWriteValidators(validatorsReadStream) {
    let count = 0;
    const pipeline = chain([
      validatorsReadStream,
      parser(),
      pick({ filter: 'data' }),
      streamArray(),
      batch({ batchSize: 100 }),
      async (batch) => {
        await this.unblock();
        const chunk: Validator[] = [];
        for (const validator of batch) {
          const parsedValidator = parseAsTypeOrFail(
            Validator,
            {
              pubkey: validator.value?.validator?.pubkey,
              index: validator.value?.index,
              status: validator.value?.status,
            },
            (error) => {
              throw new ConsensusDataInvalidError(`Got invalid validators`, error);
            },
          );
          chunk.push(parsedValidator);
        }
        count += chunk.length;
        // console.log('batch finished', count);
        await this.storageService.updateValidators(chunk);
      },
    ]);

    pipeline.on('data', (data) => {
      console.log('first on');
      data;
    });

    await new Promise((resolve, reject) => {
      pipeline.on('error', (error) => {
        console.log('second on error');
        reject(error);
      });
      pipeline.on('end', () => {
        console.log('third end');
        resolve(true);
      });
    }).finally(() => pipeline.destroy());
  }

  protected async getValidatorsFromConsensusStream(slotRoot: string): Promise<NodeJS.ReadableStream> {
    //: Promise<Validator[]> {
    const validatorsData: NodeJS.ReadableStream = await this.consensusService.getStateValidatorsStream({
      stateId: slotRoot,
    });

    return validatorsData;
  }

  protected async getValidatorsFromConsensus(slotRoot: string): Promise<Validator[]> {
    const validatorsData = await this.consensusService.getStateValidators({
      stateId: slotRoot,
    });

    const validators = validatorsData?.data;

    if (!Array.isArray(validators)) {
      throw new ConsensusDataInvalidError(`Validators must be array`);
    }

    return validators.map((validator) => {
      // runtime type check
      /* istanbul ignore next */
      return parseAsTypeOrFail(
        Validator,
        {
          pubkey: validator.validator?.pubkey,
          index: validator.index,
          status: validator.status,
        },
        (error) => {
          throw new ConsensusDataInvalidError(`Got invalid validators`, error);
        },
      );
    });
  }

  protected async getSlotHeaderFromConsensus(blockId: BlockId): Promise<BlockHeader> {
    const header = await this.consensusService.getBlockHeader({
      blockId: blockId.toString(),
    });

    /* istanbul ignore next */
    const root = header?.data?.root;
    /* istanbul ignore next */
    const slot = header?.data?.header?.message?.slot;

    /**
     * TODO Should we have an option to check `execution_optimistic === false`
     */

    return parseAsTypeOrFail(
      BlockHeader,
      {
        root,
        slot,
      },
      (error) => {
        throw new ConsensusDataInvalidError(`Got invalid block header`, error);
      },
    );
  }

  protected async getConsensusMetaFromConsensus(blockId: string): Promise<ConsensusMeta> {
    const block = await this.consensusService.getBlockV2({
      blockId: blockId,
    });

    /* istanbul ignore next */
    const beaconBlockBody = block?.data?.message?.body;
    const executionPayload =
      beaconBlockBody && 'execution_payload' in beaconBlockBody ? beaconBlockBody.execution_payload : null;

    if (!executionPayload) {
      throw new ConsensusDataInvalidError(`No execution_payload data in a block`);
    }

    /* istanbul ignore next */
    const slot = parseAsTypeOrFail(Slot, block?.data?.message?.slot, (error) => {
      throw new ConsensusDataInvalidError(`Got invalid slot`, error);
    });

    const epoch = calcEpochBySlot(slot);

    /* istanbul ignore next */
    const slotStateRoot = block?.data?.message?.state_root;

    /* istanbul ignore next */
    const blockNumber = executionPayload.block_number;
    const blockHash = executionPayload.block_hash;
    const timestamp = executionPayload.timestamp;

    /* istanbul ignore next */
    return parseAsTypeOrFail(
      ConsensusMeta,
      {
        epoch,
        slot,
        slotStateRoot,
        blockNumber,
        blockHash,
        timestamp,
      },
      (error) => {
        throw new ConsensusDataInvalidError(`Got invalid ConsensusMeta`, error);
      },
    );
  }
}
