import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { KeyListResponse } from './entities';
import { ConfigService } from 'common/config';
import { ELBlockSnapshot, KeyQuery } from 'http/common/entities';
import { CuratedModuleService } from 'staking-router-modules/';
import { httpExceptionTooEarlyResp } from 'http/common/entities/http-exceptions/too-early-resp';
import { StakingRouterService } from 'staking-router-modules/staking-router.service';

@Injectable()
export class KeysService {
  constructor(
    @Inject(LOGGER_PROVIDER) protected readonly logger: LoggerService,
    protected configService: ConfigService,
    protected stakingRouterService: StakingRouterService,
    protected curated: CuratedModuleService,
  ) {}

  async get(filters: KeyQuery): Promise<any> {
    const meta = await this.stakingRouterService.getElBlockSnapshot();
    const keysGeneratorsByModules = await this.stakingRouterService.getKeysStream(filters);

    if (!meta) {
      this.logger.warn(`Meta is null, maybe data hasn't been written in db yet.`);
      throw httpExceptionTooEarlyResp();
    }

    return {
      keysGeneratorsByModules,
      meta,
    };
  }

  async getByPubkey(pubkey: string): Promise<KeyListResponse> {
    return await this.stakingRouterService.getKeysByPubkey(pubkey);
  }

  async getByPubkeys(pubkeys: string[]): Promise<KeyListResponse> {
    return await this.stakingRouterService.getKeysByPubKeys(pubkeys);
  }
}
