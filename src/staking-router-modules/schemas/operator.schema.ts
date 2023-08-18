import * as avro from 'avsc';

export const elBlockSnapshotSchemaV1: avro.Schema = {
  type: 'record',
  name: 'elBlockSnapshotSchema',
  fields: [
    { name: 'blockNumber', type: 'int' },
    { name: 'blockHash', type: 'string' },
    { name: 'timestamp', type: 'int' },
  ],
};

export const operatorSchemaV1: avro.Schema = {
  type: 'record',
  name: 'operator',
  fields: [
    { type: 'int', name: 'index' },
    { type: 'boolean', name: 'active', default: true },
    { type: 'string', name: 'name' },
    { type: 'string', name: 'rewardAddress' },
    { type: 'int', name: 'stakingLimit' },
    { type: 'int', name: 'stoppedValidators' },
    { type: 'int', name: 'totalSigningKeys' },
    { type: 'int', name: 'usedSigningKeys' },
  ],
};

export const moduleTypeSchemaV1: avro.Schema = {
  type: 'enum',
  name: 'moduleType',
  symbols: ['curated_onchain_v1', 'simple_dvt_onchain_v1'],
};

export const moduleStatusSchemaV1: avro.Schema = {
  type: 'enum',
  name: 'moduleStatus',
  symbols: ['Active', 'DepositsPaused', 'Stopped'],
};

export const moduleSchemaV1: avro.Schema = {
  type: 'record',
  name: 'module',
  fields: [
    { type: 'int', name: 'id' },
    { type: 'string', name: 'stakingModuleAddress' },
    { type: 'int', name: 'moduleFee' },
    { type: 'int', name: 'treasuryFee' },
    { type: 'int', name: 'targetShare' },
    { type: 'int', name: 'status' },
    { type: 'string', name: 'name' },
    { type: 'int', name: 'lastDepositAt' },
    { type: 'int', name: 'lastDepositBlock' },
    { type: 'string', name: 'type' },
    { type: 'int', name: 'nonce' },
  ],
};

export const moduleOperatorsTypeV1 = avro.Type.forSchema({
  type: 'record',
  name: 'moduleOperators',
  fields: [
    { name: 'module', type: ['null', moduleSchemaV1], default: null },
    { name: 'meta', type: ['null', elBlockSnapshotSchemaV1], default: null },
    { name: 'operator', type: ['null', operatorSchemaV1], default: null },
  ],
});
