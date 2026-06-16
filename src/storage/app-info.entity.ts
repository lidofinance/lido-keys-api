import { Entity, EntityRepositoryType, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import { ADDRESS_LEN } from '../common/registry/storage/constants';
import { AppInfoRepository } from './app-info.repository';

@Entity({ customRepository: () => AppInfoRepository })
export class AppInfoEntity {
  [EntityRepositoryType]?: AppInfoRepository;

  constructor(info: AppInfoEntity) {
    this.chainId = info.chainId;
    this.locatorAddress = info.locatorAddress;
  }

  @PrimaryKey()
  chainId: number;

  @Unique()
  @Property({
    length: ADDRESS_LEN,
  })
  locatorAddress: string;
}
