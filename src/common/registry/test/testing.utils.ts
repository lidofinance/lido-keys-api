/* eslint-disable @typescript-eslint/no-explicit-any */
import { RegistryKey, RegistryOperator } from '../';
import { AbstractRegistryService } from '../main/abstract-registry';

type Expected = {
  keys: RegistryKey[];
  operators: RegistryOperator[];
};

// TODO: why meta? if we compare keys
export const compareTestMetaKeys = async (
  registryService: AbstractRegistryService,
  { keys }: Pick<Expected, 'keys'>,
) => {
  const sorted = keys.sort((a, b) => a.operatorIndex - b.operatorIndex);
  const fetchedAndSorted = await (
    await registryService.getOperatorsKeysFromStorage()
  ).sort((a, b) => a.operatorIndex - b.operatorIndex);

  expect(fetchedAndSorted).toEqual(sorted);
};

// TODO: why meta? if we compare operators
export const compareTestMetaOperators = async (
  registryService: AbstractRegistryService,
  { operators }: Pick<Expected, 'operators'>,
) => {
  expect(operators).toEqual(await registryService.getOperatorsFromStorage());
};

export const compareTestMeta = async (registryService: AbstractRegistryService, { keys, operators }: Expected) => {
  await compareTestMetaKeys(registryService, { keys });
  await compareTestMetaOperators(registryService, { operators });
};

// TODO: maybe add address as argument
export const fetchKeyMock = (fromIndex = 0, toIndex = 1, expected: Array<any>) => {
  return expected.splice(fromIndex, toIndex);
};

export const clone = <T>(obj: T) => JSON.parse(JSON.stringify(obj)) as T;
