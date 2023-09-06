//TODO: KeysFilter HTTP query
// should staking router service import this type from http/entities
export interface KeysFilter {
  used?: boolean;
  operatorIndex?: number;
}

export interface OperatorsFilter {
  index?: number;
}
