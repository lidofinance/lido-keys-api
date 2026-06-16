import { Injectable } from '@nestjs/common';
import { AppInfoEntity } from './app-info.entity';
import { AppInfoRepository } from './app-info.repository';

@Injectable()
export class AppInfoStorageService {
  constructor(private readonly repository: AppInfoRepository) {}

  async get(): Promise<AppInfoEntity | null> {
    const result = await this.repository.find({}, { limit: 1 });
    return result[0] ?? null;
  }

  async update(appInfo: AppInfoEntity): Promise<void> {
    await this.repository.nativeDelete({});
    await this.repository.persist(
      new AppInfoEntity({
        chainId: appInfo.chainId,
        locatorAddress: appInfo.locatorAddress,
      }),
    );
    await this.repository.flush();
  }

  async removeAll() {
    return await this.repository.nativeDelete({});
  }
}
