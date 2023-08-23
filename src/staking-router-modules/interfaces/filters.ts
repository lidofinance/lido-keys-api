// TODO: here should be general type for key
// will be used in /v1/keys and /v1/modules/keys

// TODO: keyOf from key db  interface
export type KeyField = 'key' | 'depositSignature' | 'operatorIndex' | 'used' | 'moduleAddress';

//TODO: KeysFilter HTTP query
// should staking router service import this type from http/entities
export interface KeysFilter {
  used?: boolean;
  operatorIndex?: number;
}

export interface OperatorsFilter {
  index?: number;
}
