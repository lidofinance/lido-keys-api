import { CallOverrides } from '../interfaces/overrides.interface';

export interface OperatorNameResolver {
  resolve(moduleAddress: string, operatorIndex: number, overrides?: CallOverrides): Promise<string>;
  /** names stored outside the module change without a module event, so the resolver reports it */
  namesWereChanged?(moduleAddress: string, fromBlock: number, toBlock: number): Promise<boolean>;
}

/** the name was read from the chain but can't be decoded (e.g. malformed UTF-8), unlike transport errors */
export class InvalidOperatorNameError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'InvalidOperatorNameError';
  }
}

export const OPERATOR_NAME_RESOLVERS_TOKEN = Symbol('OPERATOR_NAME_RESOLVERS');

export type OperatorNameResolversConfig = Record<string, OperatorNameResolver>;
