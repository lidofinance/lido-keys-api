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
    protected curatedService: CuratedModuleService,
    protected configService: ConfigService,
    protected stakingRouterService: StakingRouterService,
  ) {}

  async get(filters: KeyQuery): Promise<any> {
    const stakingModules = await this.stakingRouterService.getStakingModules();

    if (stakingModules.length === 0) {
      this.logger.warn("No staking modules in list. Maybe didn't fetched from SR yet");
      throw httpExceptionTooEarlyResp();
    }

    // keys could be of type CuratedKey | CommunityKey
    // const collectedKeys: KeyWithModuleAddress[][] = [];
    let elBlockSnapshot: ELBlockSnapshot | null = null;

    const { keysStream, meta } = await this.curatedService.getKeysWithMetaStream({
      used: filters.used,
      operatorIndex: filters.operatorIndex,
    });

    // TODO: how will work fetching data from multiple modules

    if (!meta) {
      this.logger.warn("Meta is null, maybe data hasn't been written in db yet.");
      throw httpExceptionTooEarlyResp();
    }

    elBlockSnapshot = new ELBlockSnapshot(meta);

    if (!elBlockSnapshot) {
      this.logger.warn("Meta for response wasn't set.");
      throw httpExceptionTooEarlyResp();
    }

    return {
      keysStream,
      meta: {
        elBlockSnapshot,
      },
    };
  }

  async getByPubkey(pubkey: string): Promise<KeyListResponse> {
    return await this.stakingRouterService.getKeysByPubkey(pubkey);
  }

  async getByPubkeys(pubkeys: string[]): Promise<KeyListResponse> {
    return await this.stakingRouterService.getKeysByPubKeys(pubkeys);
  }
}
