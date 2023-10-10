import {
  Controller,
  Get,
  Version,
  Param,
  Query,
  Body,
  Post,
  NotFoundException,
  HttpStatus,
  Res,
  HttpCode,
} from '@nestjs/common';
import { ApiNotFoundResponse, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SRModuleKeyListResponse, GroupedByModuleKeyListResponse } from './entities';
import { SRModulesKeysService } from './sr-modules-keys.service';
import { KeyQuery, Key } from '../common/entities/';
import { KeysFindBody } from '../common/entities/pubkeys';
import { TooEarlyResponse } from '../common/entities/http-exceptions';
import { IsolationLevel } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/knex';
import * as JSONStream from 'jsonstream';
import type { FastifyReply } from 'fastify';
import { ModuleIdPipe } from '../common/pipeline/module-id-pipe';

@Controller('modules')
@ApiTags('sr-module-keys')
export class SRModulesKeysController {
  constructor(
    protected readonly srModulesKeysService: SRModulesKeysService,
    protected readonly entityManager: EntityManager,
  ) {}

  @Version('1')
  @ApiOperation({ summary: 'Get keys for all modules grouped by staking router module.' })
  @ApiResponse({
    status: 200,
    description:
      'Keys for all modules are grouped by the staking router module. Receiving results from this endpoint may take some time, so please use it carefully.',
    type: GroupedByModuleKeyListResponse,
  })
  @ApiResponse({
    status: 425,
    description: "Meta is null, maybe data hasn't been written in db yet",
    type: TooEarlyResponse,
  })
  @Get('keys')
  getGroupedByModuleKeys(@Query() filters: KeyQuery) {
    return this.srModulesKeysService.getGroupedByModuleKeys(filters);
  }

  @Version('1')
  @ApiOperation({ summary: 'Staking router module keys.' })
  @ApiResponse({
    status: 200,
    description: 'List of all modules supported in API',
    type: SRModuleKeyListResponse,
  })
  @ApiResponse({
    status: 425,
    description: "Meta is null, maybe data hasn't been written in db yet",
    type: TooEarlyResponse,
  })
  @ApiNotFoundResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Provided module is not supported',
    type: NotFoundException,
  })
  @ApiParam({
    name: 'module_id',
    type: String,
    description: 'Staking router module_id or contract address.',
  })
  @Get(':module_id/keys')
  async getModuleKeys(
    @Param('module_id', ModuleIdPipe) module_id: string | number,
    @Query() filters: KeyQuery,
    @Res() reply: FastifyReply,
  ) {
    await this.entityManager.transactional(
      async () => {
        const {
          keysGenerator,
          module: srModule,
          meta,
        } = await this.srModulesKeysService.getModuleKeys(module_id, filters);
        const jsonStream = JSONStream.stringify(
          '{ "meta": ' + JSON.stringify(meta) + ', "data": { "module": ' + JSON.stringify(srModule) + ', "keys": [',
          ',',
          ']}}',
        );

        reply.type('application/json').send(jsonStream);

        for await (const key of keysGenerator) {
          const keyReponse = new Key(key);
          jsonStream.write(keyReponse);
        }

        jsonStream.end();
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );
  }

  @Version('1')
  @Post(':module_id/keys/find')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get list of found staking router module keys in db from pubkey list.' })
  @ApiResponse({
    status: 200,
    description: 'Staking Router module keys.',
    type: SRModuleKeyListResponse,
  })
  @ApiResponse({
    status: 425,
    description: "Meta is null, maybe data hasn't been written in db yet",
    type: TooEarlyResponse,
  })
  @ApiNotFoundResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Provided module is not supported',
    type: NotFoundException,
  })
  @ApiParam({
    name: 'module_id',
    type: String,
    description: 'Staking router module_id or contract address.',
  })
  getModuleKeysByPubkeys(@Param('module_id', ModuleIdPipe) module_id: string | number, @Body() keys: KeysFindBody) {
    return this.srModulesKeysService.getModuleKeysByPubKeys(module_id, keys.pubkeys);
  }
}
