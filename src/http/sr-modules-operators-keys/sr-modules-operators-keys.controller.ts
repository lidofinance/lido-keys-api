import * as avro from 'avsc';
import { Controller, Get, Version, Param, Query, NotFoundException, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiParam, ApiNotFoundResponse } from '@nestjs/swagger';
import { SRModuleOperatorsKeysResponse, SRModulesOperatorsKeysStreamResponse } from './entities';
import { ModuleId, KeyQuery } from 'http/common/entities/';
import { SRModulesOperatorsKeysService } from './sr-modules-operators-keys.service';
import { TooEarlyResponse } from 'http/common/entities/http-exceptions';
import { EntityManager } from '@mikro-orm/knex';
import * as JSONStream from 'jsonstream';
import type { FastifyReply } from 'fastify';
import { IsolationLevel } from '@mikro-orm/core';
import { modulesOperatorsKeysTypeV1 } from './schemas/operator.schema';

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
  async getOperatorsKeys(
    @Param('module_id') moduleId: ModuleId,
    @Query() filters: KeyQuery,
    @Res() reply: FastifyReply,
  ) {
    await this.entityManager.transactional(
      async () => {
        const { operators, keysGenerator, module, meta } = await this.srModulesOperatorsKeys.get(moduleId, filters);

        const jsonStream = JSONStream.stringify(
          '{ "meta": ' +
            JSON.stringify(meta) +
            ', "data": { "module": ' +
            JSON.stringify(module) +
            ', "operators": ' +
            JSON.stringify(operators) +
            ', "keys": [',
          ',',
          ']}}',
        );

        reply.type('application/json').send(jsonStream);

        for await (const keysBatch of keysGenerator) {
          jsonStream.write(JSON.stringify(keysBatch));
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
  @ApiParam({
    name: 'include_keys',
    description: 'Whether include registry keys in the stream',
  })
  @Get('operators/keys')
  async getModulesOperatorsKeysStream(@Res() reply: FastifyReply) {
    const encoder = new avro.streams.BlockEncoder(modulesOperatorsKeysTypeV1);

    function write(data: any) {
      const end = new Promise((resolve) => {
        if (!encoder.write(data)) {
          encoder.once('drain', () => resolve(true));
        } else {
          process.nextTick(() => resolve(true));
        }
      });

      return end;
    }

    reply.type('application/octet-stream').send(encoder);

    await this.entityManager.transactional(
      async () => {
        try {
          for await (const record of this.srModulesOperatorsKeys.getModulesOperatorsKeysStream()) {
            const { meta, stakingModule, operator, key } = record;
            await write({
              meta: meta?.elBlockSnapshot,
              module: stakingModule,
              operator,
              key,
            });
          }
        } catch (error) {
          console.error('Error while streaming operators', { error });
        } finally {
          encoder.end();
        }
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );
  }
}
