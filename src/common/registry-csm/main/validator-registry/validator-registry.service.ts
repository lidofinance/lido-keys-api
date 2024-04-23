import { RegistryOperator } from '../../../registry/storage/operator.entity';
import { AbstractRegistryService } from '../abstract-registry';

export class ValidatorRegistryService extends AbstractRegistryService {
  public getToIndex(currOperator: RegistryOperator) {
    // the right border for updating range is used keys
    return currOperator.usedSigningKeys;
  }

  /** returns used keys from the db */
  public async getValidatorsKeysFromStorage(moduleAddress: string) {
    return await this.keyStorage.findUsed(moduleAddress);
  }
}
