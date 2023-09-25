import { ELBlockSnapshot, Key, Operator } from 'http/common/entities';
import { SrModuleEntity } from 'storage/sr-module.entity';

export type MetaStreamRecord = { elBlockSnapshot: ELBlockSnapshot } | null;

export type ModulesOperatorsKeysRecord = {
  stakingModule: SrModuleEntity | null;
  key: Key | null;
  operator: Operator | null;
  meta: MetaStreamRecord;
};
