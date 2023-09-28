import { Controller, Get, Version, Param, Query, NotFoundException, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiParam, ApiNotFoundResponse } from '@nestjs/swagger';
import { SRModuleOperatorsKeysResponse } from './entities';
import { ModuleId, KeyQuery, Key } from '../common/entities/';
import { SRModulesOperatorsKeysService } from './sr-modules-operators-keys.service';
import { TooEarlyResponse } from '../common/entities/http-exceptions';
import { EntityManager } from '@mikro-orm/knex';
import * as JSONStream from 'jsonstream';
import type { FastifyReply } from 'fastify';
import { IsolationLevel } from '@mikro-orm/core';

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
    description: 'Staking router module_id or contract address.',
  })
  @Get(':module_id/operators/keys')
  async getOperatorsKeys(@Param() module: ModuleId, @Query() filters: KeyQuery, @Res() reply: FastifyReply) {
    await this.entityManager.transactional(
      async () => {
        const {
          operators,
          keysGenerator,
          module: srModule,
          meta,
        } = await this.srModulesOperatorsKeys.get(module.module_id, filters);

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

        for await (const keysBatch of keysGenerator) {
          const keyReponse = new Key(keysBatch);
          jsonStream.write(keyReponse);
        }

        jsonStream.end();
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );
  }
}
