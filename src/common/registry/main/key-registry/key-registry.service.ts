import { RegistryOperator } from '../../storage/operator.entity';
import { AbstractRegistryService } from '../abstract-registry';

export class KeyRegistryService extends AbstractRegistryService {
  public getToIndex(currOperator: RegistryOperator) {
    // the right border for updating range is all operator keys
    return currOperator.totalSigningKeys;
  }
  /** returns all operators keys from the db */
  public async getAllKeysFromStorage() {
    return await this.keyStorage.findAll();
  }
  /** returns used keys from the db */
  public async getUsedKeysFromStorage() {
    return await this.keyStorage.findUsed();
  }
}
