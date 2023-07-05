import { RegistryMeta } from '../storage/meta.entity';

export const compareMeta = (metaOne: RegistryMeta | null, metaTwo: RegistryMeta | null): boolean => {
  if (metaOne == null) return false;
  if (metaTwo == null) return false;

  const keysOpIndexOne = metaOne.keysOpIndex;
  const keysOpIndexTwo = metaTwo.keysOpIndex;

  return keysOpIndexOne === keysOpIndexTwo;
};
