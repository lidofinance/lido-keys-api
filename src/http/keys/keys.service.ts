import { Inject, Injectable, LoggerService, NotFoundException } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { KeysResponse, StakingRouterModuleKeysResponse } from './entities';
import { RegistryService } from 'jobs/registry.service';
import { stakingRouterModules } from 'common/config';
import { ConfigService } from 'common/config';
import { StakingRouterModuleType } from 'http/staking-router-modules/entities';
@Injectable()
export class KeysService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected keyRegistryService: RegistryService,
    protected configService: ConfigService,
  ) {}

  async get(fields: string[]): Promise<KeysResponse> {
    //TODO: In future iteration for staking router here will be method to get keys from all modules
    const { registryKeys, meta } = await this.getRegistryKeys(fields);

    return {
      // swagger ui не справляется с выводом всех значений
      // но пагинацию добавить не можем
      data: registryKeys,
      meta: {
        blockNumber: meta?.blockNumber ?? 0,
        blockHash: meta?.blockHash ?? '',
      },
    };
  }

  async getByPubKeys(fields: string[], pubkeys: string[]): Promise<KeysResponse> {
    // TODO: In future iteration for staking router here will be method to get keys from all modules
    // TODO: where will we use this method?
    const { registryKeys, meta } = await this.getRegistryKeysByPubkeys(fields, pubkeys);

    return {
      data: registryKeys,
      meta: {
        blockNumber: meta.blockNumber,
        blockHash: meta.blockHash,
      },
    };
  }

  async getForModule(
    moduleAddress: string,
    fields: string[],
    used: boolean | undefined,
  ): Promise<StakingRouterModuleKeysResponse> {
    const moduleInfo = this.getStakingRouterModule(moduleAddress);

    if (!moduleInfo) {
      throw new NotFoundException(`Module with address ${moduleAddress} is not supported`);
    }

    if (moduleInfo.type == StakingRouterModuleType.CURATED) {
      const { registryKeys, meta } = await this.getRegistryKeys(fields, used);

      return {
        data: registryKeys,
        meta: {
          moduleAddress,
          blockNumber: meta.blockNumber,
          blockHash: meta.blockHash,
          timestamp: meta.timestamp,
          keysOpIndex: meta.keysOpIndex,
        },
      };
    }
  }

  async getForModuleByPubkeys(
    moduleAddress: string,
    fields: string[],
    pubkeys: string[],
  ): Promise<StakingRouterModuleKeysResponse> {
    const moduleInfo = this.getStakingRouterModule(moduleAddress);

    if (!moduleInfo) {
      throw new NotFoundException(`Module with address ${moduleAddress} is not supported`);
    }

    if (moduleInfo.type == StakingRouterModuleType.CURATED) {
      const { registryKeys, meta } = await this.getRegistryKeysByPubkeys(fields, pubkeys);

      return {
        data: registryKeys,
        meta: {
          moduleAddress,
          blockNumber: meta.blockNumber,
          blockHash: meta.blockHash,
          timestamp: meta.timestamp,
          keysOpIndex: meta.keysOpIndex,
        },
      };
    }
  }

  private async getRegistryKeysByPubkeys(fields: string[], pubkeys: string[]) {
    const { keys, meta } = await this.keyRegistryService.getKeysWithMetaByPubKeys(pubkeys);

    const registryKeys = keys.map((registryKey) => ({
      key: registryKey.key,
      ...this.transformKey(registryKey, fields),
    }));

    return { registryKeys, meta };
  }

  /**
   * Get registry keys from db with meta
   **/
  private async getRegistryKeys(fields: string[], used?: boolean) {
    const filters = used != undefined ? { used } : {};
    const { keys, meta } = await this.keyRegistryService.getKeysWithMeta(filters);

    const registryKeys = keys.map((registryKey) => ({
      key: registryKey.key,
      ...this.transformKey(registryKey, fields),
    }));

    return { registryKeys, meta };
  }

  private getStakingRouterModule(moduleAddress) {
    const chainId = this.configService.get('CHAIN_ID');
    return stakingRouterModules[chainId].find((module) => module.address == moduleAddress);
  }

  private transformKey(key: object, fields: string[]) {
    return fields.reduce((acc, field) => {
      acc[field] = key[field];
      return acc;
    }, {});
  }
}
