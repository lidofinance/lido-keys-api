import { CallOverrides } from '../interfaces/overrides.interface';

export interface OperatorNameResolver {
  resolve(moduleAddress: string, operatorIndex: number, overrides?: CallOverrides): Promise<string>;
  /** names stored outside the module change without a module event, so the resolver reports it */
  namesWereChanged?(moduleAddress: string, fromBlock: number, toBlock: number): Promise<boolean>;
}

export const OPERATOR_NAME_RESOLVERS_TOKEN = Symbol('OPERATOR_NAME_RESOLVERS');

export type OperatorNameResolversConfig = Record<string, OperatorNameResolver>;
