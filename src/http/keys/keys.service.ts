import { Inject, Injectable, LoggerService, NotFoundException } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { KeyListResponse, KeyWithModuleAddress } from './entities';
import { ConfigService } from 'common/config';
import { ELBlockSnapshot, KeyQuery } from 'http/common/entities';
import { CuratedModuleService, STAKING_MODULE_TYPE } from 'staking-router-modules/';
import { KeysUpdateService } from 'jobs/keys-update';

@Injectable()
export class KeysService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected curatedService: CuratedModuleService,
    protected configService: ConfigService,
    protected keysUpdateService: KeysUpdateService,
  ) {}

  async get(filters: KeyQuery): Promise<KeyListResponse> {
    const stakingModules = await this.keysUpdateService.getStakingModules();

    if (stakingModules.length === 0) {
      // TODO: move to constants
      return {
        data: [],
        meta: null,
      };
    }

    // keys could be of type CuratedKey | CommunityKey
    const collectedKeys: KeyWithModuleAddress[][] = [];
    let elBlockSnapshot: ELBlockSnapshot | null = null;

    // Because of current lido-nestjs/registry implementation in case of more than one
    // staking router module we need to wrap code below in transaction (with serializable isolation level that is default in mikro orm )
    // to prevent reading keys for different blocks
    // But now we have only one module and in current future we will try to find solution without transactions
    // TODO: rewrite to "for of" after refactoring to stakingRouterModule
    for (let i = 0; i < stakingModules.length; i++) {
      if (stakingModules[i].type == STAKING_MODULE_TYPE.CURATED_ONCHAIN_V1_TYPE) {
        // If some of modules has null meta, it means update hasnt been finished
        const { keys: curatedKeys, meta } = await this.curatedService.getKeysWithMeta(filters);
        if (!meta) {
          this.logger.warn(`Meta is null, maybe data hasn't been written in db yet.`);
          return {
            data: [],
            meta: null,
          };
        }

        const keysWithAddress: KeyWithModuleAddress[] = curatedKeys.map(
          (key) => new KeyWithModuleAddress(key, stakingModules[i].stakingModuleAddress),
        );

        // meta should be the same for all modules
        // so in answer we can use meta of any module
        // lets use meta of first module in list
        // currently we sure if stakingModules is not empty, we will have in list Curated Module
        // in future this check should be in each if clause
        if (i === 0) {
          elBlockSnapshot = new ELBlockSnapshot(meta);
        }

        collectedKeys.push(keysWithAddress);
      }
    }

    // we check stakingModules list types so this condition should never be true
    if (!elBlockSnapshot) {
      return {
        data: [],
        meta: null,
      };
    }

    return {
      data: collectedKeys.flat(),
      meta: {
        elBlockSnapshot,
      },
    };
  }

  async getByPubkey(pubkey: string): Promise<KeyListResponse> {
    const stakingModules = await this.keysUpdateService.getStakingModules();

    if (stakingModules.length == 0) {
      return {
        data: [],
        meta: null,
      };
    }

    // keys could be of type CuratedKey | CommunityKey
    const collectedKeys: KeyWithModuleAddress[][] = [];
    let elBlockSnapshot: ELBlockSnapshot | null = null;

    for (let i = 0; i < stakingModules.length; i++) {
      if (stakingModules[i].type == STAKING_MODULE_TYPE.CURATED_ONCHAIN_V1_TYPE) {
        // If some of modules has null meta, it means update hasnt been finished
        const { keys: curatedKeys, meta } = await this.curatedService.getKeyWithMetaByPubkey(pubkey);
        if (!meta) {
          this.logger.warn(`Meta is null, maybe data hasn't been written in db yet.`);
          return {
            data: [],
            meta: null,
          };
        }

        const keysWithAddress: KeyWithModuleAddress[] = curatedKeys.map(
          (key) => new KeyWithModuleAddress(key, stakingModules[i].stakingModuleAddress),
        );

        // meta should be the same for all modules
        // so in answer we can use meta of any module
        // lets use meta of first module in list
        // currently we sure if stakingModules is not empty, we will have in list Curated Module
        // in future this check should be in each if clause
        if (i == 0) {
          elBlockSnapshot = new ELBlockSnapshot(meta);
        }

        collectedKeys.push(keysWithAddress);
      }
    }

    // we check stakingModules list types so this condition should never be true
    if (!elBlockSnapshot) {
      return {
        data: [],
        meta: null,
      };
    }

    const keys = collectedKeys.flat();
    if (keys.length == 0) {
      throw new NotFoundException(`There are no keys with ${pubkey} public key in db.`);
    }

    return {
      data: keys,
      meta: {
        elBlockSnapshot,
      },
    };
  }

  async getByPubkeys(pubkeys: string[]): Promise<KeyListResponse> {
    const stakingModules = await this.keysUpdateService.getStakingModules();

    if (stakingModules.length == 0) {
      return {
        data: [],
        meta: null,
      };
    }

    // keys could be of type CuratedKey | CommunityKey
    const collectedKeys: KeyWithModuleAddress[][] = [];
    let elBlockSnapshot: ELBlockSnapshot | null = null;

    for (let i = 0; i < stakingModules.length; i++) {
      if (stakingModules[i].type == STAKING_MODULE_TYPE.CURATED_ONCHAIN_V1_TYPE) {
        // If some of modules has null meta, it means update hasnt been finished
        const { keys: curatedKeys, meta } = await this.curatedService.getKeysWithMetaByPubkeys(pubkeys);
        if (!meta) {
          this.logger.warn(`Meta is null, maybe data hasn't been written in db yet.`);
          return {
            data: [],
            meta: null,
          };
        }

        const keysWithAddress: KeyWithModuleAddress[] = curatedKeys.map(
          (key) => new KeyWithModuleAddress(key, stakingModules[i].stakingModuleAddress),
        );

        // meta should be the same for all modules
        // so in answer we can use meta of any module
        // lets use meta of first module in list
        // currently we sure if stakingModules is not empty, we will have in list Curated Module
        // in future this check should be in each if clause
        if (i == 0) {
          elBlockSnapshot = new ELBlockSnapshot(meta);
        }

        collectedKeys.push(keysWithAddress);
      }
    }

    // we check stakingModules list types so this condition should never be true
    if (!elBlockSnapshot) {
      return {
        data: [],
        meta: null,
      };
    }

    return {
      data: collectedKeys.flat(),
      meta: {
        elBlockSnapshot,
      },
    };
  }
}
