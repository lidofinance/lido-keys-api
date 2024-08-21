/* eslint-disable @typescript-eslint/no-explicit-any */
import { RegistryKey, RegistryOperator } from '../';
import { AbstractRegistryService } from '../main/abstract-registry';

type Expected = {
  keys: RegistryKey[];
  operators: RegistryOperator[];
};

export const compareTestKeys = async (
  address: string,
  registryService: AbstractRegistryService,
  { keys }: Pick<Expected, 'keys'>,
) => {
  const sorted = keys.sort((a, b) => a.operatorIndex - b.operatorIndex);

  const fetchedAndSorted = await (
    await registryService.getOperatorsKeysFromStorage(address)
  ).sort((a, b) => a.operatorIndex - b.operatorIndex);

  expect(fetchedAndSorted).toEqual(expect.arrayContaining(sorted));
  expect(fetchedAndSorted.length).toEqual(sorted.length);
};

export const compareTestOperators = async (
  address: string,
  registryService: AbstractRegistryService,
  { operators }: Pick<Expected, 'operators'>,
) => {
  expect(operators).toEqual(await registryService.getOperatorsFromStorage(address));
};

export const compareTestKeysAndOperators = async (
  address: string,
  registryService: AbstractRegistryService,
  { keys, operators }: Expected,
) => {
  await compareTestKeys(address, registryService, { keys });
  await compareTestOperators(address, registryService, { operators });
};

export const clone = <T>(obj: T) => JSON.parse(JSON.stringify(obj)) as T;

/** clears the db */
// can we get rid of it?
export const clearDb = async (orm) => {
  const em = orm.em;

  await em.transactional(async (em) => {
    const keyRepository = em.getRepository(RegistryKey);
    await keyRepository.nativeDelete({});

    const operatorRepository = em.getRepository(RegistryKey);
    await operatorRepository.nativeDelete({});
  });
};
