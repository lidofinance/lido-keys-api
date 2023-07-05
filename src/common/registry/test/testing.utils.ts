/* eslint-disable @typescript-eslint/no-explicit-any */
import { RegistryKey, RegistryMeta, RegistryOperator } from '../';
import { AbstractRegistryService } from '../main/abstract-registry';

type Expected = {
  keys: RegistryKey[];
  operators: RegistryOperator[];
  meta: RegistryMeta;
};

export const compareTestMetaKeys = async (
  registryService: AbstractRegistryService,
  { keys }: Pick<Expected, 'keys'>,
) => {
  expect(keys.sort((a, b) => a.operatorIndex - b.operatorIndex)).toEqual(
    await (await registryService.getOperatorsKeysFromStorage()).sort((a, b) => a.operatorIndex - b.operatorIndex),
  );
};

export const compareTestMetaOperators = async (
  registryService: AbstractRegistryService,
  { operators }: Pick<Expected, 'operators'>,
) => {
  expect(operators).toEqual(await registryService.getOperatorsFromStorage());
};

export const compareTestMetaData = async (
  registryService: AbstractRegistryService,
  { meta }: Pick<Expected, 'meta'>,
) => {
  expect(meta).toEqual(await registryService.getMetaDataFromStorage());
};

export const compareTestMeta = async (
  registryService: AbstractRegistryService,
  { keys, meta, operators }: Expected,
) => {
  await compareTestMetaKeys(registryService, { keys });
  await compareTestMetaOperators(registryService, { operators });
  await compareTestMetaData(registryService, { meta });
};

export const fetchKeyMock = (fromIndex = 0, toIndex = 1, expected: Array<any>) => {
  return expected.splice(fromIndex, toIndex);
};

export const clone = <T>(obj: T) => JSON.parse(JSON.stringify(obj)) as T;
