import { IsolationLevel } from '@mikro-orm/core';
import {
  Controller,
  Get,
  Version,
  Param,
  Query,
  NotFoundException,
  HttpStatus,
  Res,
  LoggerService,
  Inject,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { SRModuleOperatorsKeysResponse, SRModulesOperatorsKeysStreamResponse } from './entities';
import { KeyQuery, Key } from 'http/common/entities/';
import { SRModulesOperatorsKeysService } from './sr-modules-operators-keys.service';
import { TooEarlyResponse } from '../common/entities/http-exceptions';
import { EntityManager } from '@mikro-orm/knex';
import * as JSONStream from 'jsonstream';
import type { FastifyReply } from 'fastify';
import { ModuleIdPipe } from 'http/common/pipeline/module-id-pipe';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { SkipCache } from 'common/decorators/skipCache';

@Controller('/modules')
@ApiTags('operators-keys')
export class SRModulesOperatorsKeysController {
  constructor(
    @Inject(LOGGER_PROVIDER) protected logger: LoggerService,
    protected readonly srModulesOperatorsKeys: SRModulesOperatorsKeysService,
    protected readonly entityManager: EntityManager,
  ) {}

  @Version('1')
  @SkipCache()
  @ApiOperation({ summary: 'Staking router module operators' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all SR module operators',
    type: SRModuleOperatorsKeysResponse,
  })
  @ApiResponse({
    status: 425,
    description: "Meta is null, maybe data hasn't been written in db yet",
    type: TooEarlyResponse,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Provided module is not supported',
    type: NotFoundException,
  })
  @ApiParam({
    name: 'module_id',
    type: String,
    description: 'Staking router module_id or contract address',
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

        try {
          for await (const key of keysGenerator) {
            const keyResponse = new Key(key);
            jsonStream.write(keyResponse);
          }

          jsonStream.end();
        } catch (streamError) {
          // Handle the error during streaming.
          this.logger.error('operators-keys streaming error', streamError);
          // destroy method closes the stream without ']' and corrupt the result
          // https://github.com/dominictarr/through/blob/master/index.js#L78
          jsonStream.destroy();
        }
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );
  }

  @Version('2')
  @SkipCache()
  @ApiOperation({ summary: 'Comprehensive stream for staking router modules, operators and their keys' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Stream of all SR modules, operators and keys',
    type: SRModulesOperatorsKeysStreamResponse,
    isArray: true,
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

    const generator = await this.srModulesOperatorsKeys.getModulesOperatorsKeysGenerator();

    await this.entityManager.transactional(
      async () => {
        try {
          for await (const value of generator) {
            jsonStream.write(value);
          }

          jsonStream.end();
        } catch (error) {
          if (error instanceof Error) {
            const message = error.message;
            const stack = error.stack;
            this.logger.error(`modules-operators-keys error: ${message}`, stack);
          } else {
            this.logger.error('modules-operators-keys unknown error');
          }

          jsonStream.destroy();
        }
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );
  }
}
