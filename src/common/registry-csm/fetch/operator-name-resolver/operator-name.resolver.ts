import { CallOverrides } from '../interfaces/overrides.interface';

export interface OperatorNameResolver {
  resolve(moduleAddress: string, operatorIndex: number, overrides?: CallOverrides): Promise<string>;
}

export const OPERATOR_NAME_RESOLVERS_TOKEN = Symbol('OPERATOR_NAME_RESOLVERS');

export type OperatorNameResolversConfig = Record<string, OperatorNameResolver>;
