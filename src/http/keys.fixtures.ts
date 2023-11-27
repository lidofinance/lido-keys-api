import { Key } from './common/entities';
import { curatedModuleKeys, dvtModuleKeys } from './db.fixtures';
import { dvtModuleAddressWithChecksum, curatedModuleAddressWithCheckSum } from './module.fixture';

export const dvtModuleKeysResponse: Key[] = dvtModuleKeys.map((key) => ({
  ...key,
  moduleAddress: dvtModuleAddressWithChecksum,
}));

export const curatedModuleKeysResponse: Key[] = curatedModuleKeys.map((key) => ({
  ...key,
  moduleAddress: curatedModuleAddressWithCheckSum,
}));
