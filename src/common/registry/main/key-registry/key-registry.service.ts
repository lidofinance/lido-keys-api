import { RegistryOperator } from '../../storage/operator.entity';
import { AbstractRegistryService } from '../abstract-registry';

export class KeyRegistryService extends AbstractRegistryService {
  public getToIndex(currOperator: RegistryOperator) {
    // the right border for updating range is all operator keys
    return currOperator.totalSigningKeys;
  }
  /** returns all operators keys from the db */
  public async getModuleKeysFromStorage(moduleAddress: string) {
    return await this.keyStorage.findAll(moduleAddress);
  }
  /** returns used keys from the db */
  public async getUsedKeysFromStorage(moduleAddress: string) {
    return await this.keyStorage.findUsed(moduleAddress);
  }
}
