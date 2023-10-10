import { pipeline } from 'node:stream/promises';
import { IsolationLevel } from '@mikro-orm/core';
import { Controller, Get, Version, Param, Query, NotFoundException, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiParam, ApiNotFoundResponse } from '@nestjs/swagger';
import { SRModuleOperatorsKeysResponse, SRModulesOperatorsKeysStreamResponse } from './entities';
import { KeyQuery, Key } from 'http/common/entities/';
import { SRModulesOperatorsKeysService } from './sr-modules-operators-keys.service';
import { TooEarlyResponse } from '../common/entities/http-exceptions';
import { EntityManager } from '@mikro-orm/knex';
import * as JSONStream from 'jsonstream';
import type { FastifyReply } from 'fastify';
import { streamify } from 'common/streams';
import { ModuleIdPipe } from 'http/common/pipeline/module-id-pipe';

@Controller('/modules')
@ApiTags('operators-keys')
export class SRModulesOperatorsKeysController {
  constructor(
    protected readonly srModulesOperatorsKeys: SRModulesOperatorsKeysService,
    protected readonly entityManager: EntityManager,
  ) {}

  @Version('1')
  @ApiOperation({ summary: 'Staking router module operators.' })
  @ApiResponse({
    status: 200,
    description: 'List of all SR module operators',
    type: SRModuleOperatorsKeysResponse,
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
  @Get(':module_id/operators/keys')
  async getOperatorsKeys(
    @Param('module_id', ModuleIdPipe) module_id: string | number,
    @Query() filters: KeyQuery,
    @Res() reply: FastifyReply,
  ) {
    await this.entityManager.transactional(
      async () => {
        const {
          operators,
          keysGenerator,
          module: srModule,
          meta,
        } = await this.srModulesOperatorsKeys.get(module_id, filters);

        const jsonStream = JSONStream.stringify(
          '{ "meta": ' +
            JSON.stringify(meta) +
            ', "data": { "module": ' +
            JSON.stringify(srModule) +
            ', "operators": ' +
            JSON.stringify(operators) +
            ', "keys": [',
          ',',
          ']}}',
        );

        reply.type('application/json').send(jsonStream);

        for await (const key of keysGenerator) {
          const keyResponse = new Key(key);
          jsonStream.write(keyResponse);
        }

        jsonStream.end();
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );
  }

  @Version('2')
  @ApiOperation({ summary: 'Comprehensive stream for staking router modules, operators and their keys' })
  @ApiResponse({
    status: 200,
    description: 'Stream of all SR modules, operators and keys',
    type: SRModulesOperatorsKeysStreamResponse,
  })
  @ApiResponse({
    status: 425,
    description: 'Meta has not exist yet, maybe data was not written in db yet',
    type: TooEarlyResponse,
  })
  @Get('operators/keys')
  async getModulesOperatorsKeysStream(@Res() reply: FastifyReply) {
    const jsonStream = JSONStream.stringify();

    reply.type('application/json').send(jsonStream);

    await this.entityManager.transactional(
      () => pipeline([streamify(this.srModulesOperatorsKeys.getModulesOperatorsKeysGenerator()), jsonStream]),
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );
  }
}
