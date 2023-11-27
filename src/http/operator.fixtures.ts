import { Operator } from './common/entities';
import { operatorOneCurated, operatorOneDvt, operatorTwoCurated, operatorTwoDvt } from './db.fixtures';
import { curatedModuleAddressWithCheckSum, dvtModuleAddressWithChecksum } from './module.fixture';

// export const operatorOneDvtResp: Operator = { ...operatorOneDvt, moduleAddress: dvtModuleAddressWithChecksum };
// export const operatorOneCuratedResp: Operator = {
//   ...operatorOneCurated,
//   moduleAddress: curatedModuleAddressWithCheckSum,
// };

export const dvtOperatorsResp: Operator[] = [operatorOneDvt, operatorTwoDvt].map((op) => ({
  ...op,
  moduleAddress: dvtModuleAddressWithChecksum,
}));

export const curatedOperatorsResp: Operator[] = [operatorOneCurated, operatorTwoCurated].map((op) => ({
  ...op,
  moduleAddress: curatedModuleAddressWithCheckSum,
}));
