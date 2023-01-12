import { ModuleId } from './entities';
import { srModules } from 'common/config/sr-modules';

/**
 *
 * @param moduleId Can be a SR module address and module id
 * @param chainId Id of chain
 * @returns SR Module detailed information
 */
export function getSRModuleByType(type: string, chainId: number) {
  return srModules[chainId].find((module) => module.type == type);
}

/**
 *
 * @param moduleId Can be a SR module address and module id
 * @param chainId Id of chain
 * @returns SR Module detailed information
 */
export function getSRModule(moduleId: ModuleId, chainId: number) {
  return srModules[chainId].find((module) => module.stakingModuleAddress == moduleId || module.id == moduleId);
}
