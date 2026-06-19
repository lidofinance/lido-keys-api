export type ContractFactoryFn<T> = (address: string) => T;

export const LIDO_LOCATOR_CONTRACT_TOKEN = Symbol('LIDO_LOCATOR_CONTRACT');
export const STAKING_ROUTER_CONTRACT_TOKEN = Symbol('STAKING_ROUTER_CONTRACT');
export const REGISTRY_CONTRACT_TOKEN = Symbol('REGISTRY_CONTRACT');
export const CSM_CONTRACT_TOKEN = Symbol('CSM_CONTRACT');
export const CMV2_CONTRACT_TOKEN = Symbol('CMV2_CONTRACT');
export const META_REGISTRY_CONTRACT_TOKEN = Symbol('META_REGISTRY_CONTRACT');
