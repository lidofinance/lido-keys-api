import { ELBlockSnapshot } from 'http/common/entities';
import { KeyEntity, OperatorEntity } from 'staking-router-modules/interfaces/staking-module.interface';
import { SrModuleEntity } from 'storage/sr-module.entity';

export type MetaStreamRecord = { elBlockSnapshot: ELBlockSnapshot } | null;

export type ModulesOperatorsKeysRecord = {
  stakingModule: SrModuleEntity | null;
  key: KeyEntity | null;
  operator: OperatorEntity | null;
  meta: MetaStreamRecord;
};
