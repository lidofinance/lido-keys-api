import {
  Controller,
  Get,
  Post,
  Version,
  Query,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Res,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import { ApiNotFoundResponse, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { KeysService } from './keys.service';
import { KeyListResponse } from './entities';
import { KeyQuery } from '../common/entities';
import { KeysFindBody } from '../common/entities/pubkeys';
import { TooEarlyResponse } from '../common/entities/http-exceptions';
import * as JSONStream from 'jsonstream';
import { EntityManager } from '@mikro-orm/knex';
import { IsolationLevel } from '@mikro-orm/core';

@Controller('keys')
@ApiTags('keys')
export class KeysController {
  constructor(protected readonly keysService: KeysService, protected readonly entityManager: EntityManager) {}

  @Version('1')
  @Get('/test')
  async getTest() {
    return { data: ['test'] };
  }

  @Version('1')
  @Get()
  @ApiResponse({
    status: 425,
    description: "Meta is null, maybe data hasn't been written in db yet",
    type: TooEarlyResponse,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all keys',
    type: KeyListResponse,
  })
  @ApiOperation({ summary: 'Get list of all keys' })
  async get(@Query() filters: KeyQuery, @Res() reply: FastifyReply) {
    // TODO: explain here why we use here transaction
    await this.entityManager.transactional(
      async () => {
        const { keysGenerators, meta } = await this.keysService.get(filters);

        const jsonStream = JSONStream.stringify('{ "meta": ' + JSON.stringify(meta) + ', "data": [', ',', ']}');
        // TODO: this check is needed to prevent tests from crashing with an error,
        // in a real example this check should not be present
        reply.type('application/json').send(jsonStream);
        // TODO: is it necessary to check the error? or 'finally' is ok?
        try {
          for (const keysGenerator of keysGenerators) {
            for await (const keysBatch of keysGenerator) {
              jsonStream.write(keysBatch);
            }
          }
        } finally {
          jsonStream.end();
        }
      },
      { isolationLevel: IsolationLevel.REPEATABLE_READ },
    );
  }

  @Version('1')
  @Get(':pubkey')
  @ApiParam({
    name: 'pubkey',
    description: 'Public key',
  })
  @ApiResponse({
    status: 425,
    description: "Meta is null, maybe data hasn't been written in db yet",
    type: TooEarlyResponse,
  })
  @ApiNotFoundResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Provided pubkey was not found',
    type: NotFoundException,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all keys',
    type: KeyListResponse,
  })
  @ApiOperation({ summary: 'Get detailed information about pubkey' })
  // TODO: add check that pubkey has a right pattern
  getByPubkey(@Param('pubkey') pubkey: string) {
    return this.keysService.getByPubkey(pubkey);
  }

  @Version('1')
  @Post('/find')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 425,
    description: "Meta is null, maybe data hasn't been written in db yet",
    type: TooEarlyResponse,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Staking Router module keys.',
    type: KeyListResponse,
  })
  @ApiOperation({ summary: 'Get list of found keys in DB from pubkey list' })
  getByPubkeys(@Body() keys: KeysFindBody) {
    // TODO: add check that pubkey has a right pattern
    return this.keysService.getByPubkeys(keys.pubkeys);
  }
}
