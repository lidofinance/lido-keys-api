export type ContractFactoryFn<T> = (address: string) => T;

export const STAKING_ROUTER_CONTRACT_TOKEN = Symbol('STAKING_ROUTER_CONTRACT');
export const REGISTRY_CONTRACT_TOKEN = Symbol('REGISTRY_CONTRACT');
export const CSM_CONTRACT_TOKEN = Symbol('CSM_CONTRACT');
