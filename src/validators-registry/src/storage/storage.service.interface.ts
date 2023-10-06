import { createInterface } from '@lido-nestjs/di';
import { ConsensusMeta, ConsensusValidatorsAndMetadata, Validator } from '../types';
import { ConsensusValidatorEntity } from './consensus-validator.entity';
import { FindOptions, FilterQuery } from './interfaces';

export const StorageServiceInterface = createInterface<StorageServiceInterface>('StorageServiceInterface');

export interface StorageServiceInterface {
  /**
   * Get consensus meta from storage
   */
  getConsensusMeta(): Promise<ConsensusMeta | null>;

  /**
   * Update all consensus validators and meta in storage in one transaction
   * (update existing validators in storage and insert not existing in storage)
   */
  updateValidatorsAndMeta(validators: Validator[], meta: ConsensusMeta): Promise<void>;

  /**
   * Get consensus validators from storage
   */
  getValidators(
    pubkeys?: string[],
    where?: FilterQuery<ConsensusValidatorEntity>,
    options?: FindOptions<ConsensusValidatorEntity>,
  ): Promise<Validator[]>;

  /**
   * Get consensus validators and consensus meta from storage in one transaction
   */
  getValidatorsAndMeta(
    pubkeys?: string[],
    where?: FilterQuery<ConsensusValidatorEntity>,
    options?: FindOptions<ConsensusValidatorEntity>,
  ): Promise<ConsensusValidatorsAndMetadata>;
}
