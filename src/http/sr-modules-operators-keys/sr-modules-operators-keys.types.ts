import { ELBlockSnapshot, Key, Operator, StakingModuleResponse } from 'http/common/entities';

export type MetaStreamRecord = { elBlockSnapshot: ELBlockSnapshot } | null;

export type ModulesOperatorsKeysRecord = {
  stakingModule: StakingModuleResponse | null;
  key: Key | null;
  operator: Operator | null;
  meta: MetaStreamRecord;
};
