import { Injectable } from '@nestjs/common';
import { ConfigService } from 'common/config';
import { modules } from 'common/config';
import { ModuleResponse } from './entities';

@Injectable()
export class ModulesService {
  constructor(protected configService: ConfigService) {}

  get(): ModuleResponse {
    const chainId = this.configService.get('CHAIN_ID');

    return {
      data: modules[chainId],
    };
  }
}
