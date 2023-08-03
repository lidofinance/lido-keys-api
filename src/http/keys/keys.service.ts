import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { KeyListResponse, KeyWithModuleAddress } from './entities';
import { StakingRouterService } from 'staking-router-modules/staking-router.service';
import { ELBlockSnapshot, KeyQuery } from 'http/common/entities';

@Injectable()
export class KeysService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected stakingRouterService: StakingRouterService,
  ) {}

  async get(
    filters: KeyQuery,
  ): Promise<{ keysGenerators: AsyncGenerator<KeyWithModuleAddress>[]; meta: { elBlockSnapshot: ELBlockSnapshot } }> {
    const { keysGenerators, elBlockSnapshot } = await this.stakingRouterService.getKeysStream(filters);

    return {
      keysGenerators,
      meta: { elBlockSnapshot },
    };
  }

  async getByPubkey(pubkey: string): Promise<KeyListResponse> {
    const { keys, elBlockSnapshot } = await this.stakingRouterService.getKeysByPubkey(pubkey);
    return {
      data: keys,
      meta: { elBlockSnapshot },
    };
  }

  async getByPubkeys(pubkeys: string[]): Promise<KeyListResponse> {
    const { keys, elBlockSnapshot } = await this.stakingRouterService.getKeysByPubKeys(pubkeys);
    return {
      data: keys,
      meta: { elBlockSnapshot },
    };
  }
}
