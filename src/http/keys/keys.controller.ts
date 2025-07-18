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
  LoggerService,
  Inject,
} from '@nestjs/common';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import type { FastifyReply } from 'fastify';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { KeysService } from './keys.service';
import { KeyListResponse } from './entities';
import { Key, KeyQueryWithAddress } from '../common/entities';
import { KeysFindBody } from '../common/entities/pubkeys';
import { TooEarlyResponse } from '../common/entities/http-exceptions';
import * as JSONStream from 'jsonstream';
import { EntityManager } from '@mikro-orm/knex';
import { IsolationLevel } from '@mikro-orm/core';
import { Pubkey } from 'http/common/entities/pubkey';
import { SkipCache } from 'common/decorators/skipCache';

@Controller('keys')
@ApiTags('keys')
export class KeysController {
  constructor(
    @Inject(LOGGER_PROVIDER) protected logger: LoggerService,
    protected readonly keysService: KeysService,
    protected readonly entityManager: EntityManager,
  ) {}

  @Version('1')
  @Get()
  @SkipCache()
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
  @ApiOperation({ summary: 'Get list of all keys in stream' })
  async get(@Query() filters: KeyQueryWithAddress, @Res() reply: FastifyReply) {
    // Because the real execution of generators occurs in the controller's method, that's why we moved the transaction here
    await this.entityManager.transactional(
      async () => {
        const { keysGenerators, meta } = await this.keysService.get(filters);

        const jsonStream = JSONStream.stringify('{ "meta": ' + JSON.stringify(meta) + ', "data": [', ',', ']}');
        reply.type('application/json').send(jsonStream);

        try {
          for (const keysGenerator of keysGenerators) {
            for await (const key of keysGenerator) {
              const keyReponse = new Key(key);
              jsonStream.write(keyReponse);
            }
          }

          jsonStream.end();
        } catch (streamError) {
          // Handle the error during streaming.
          this.logger.log('keys streaming error', streamError);
          // destroy method closes the stream without ']' and corrupt the result
          // https://github.com/dominictarr/through/blob/master/index.js#L78
          jsonStream.destroy();
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
  @ApiResponse({
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
  getByPubkey(@Param() data: Pubkey) {
    return this.keysService.getByPubkey(data.pubkey);
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
    description: 'Staking Router module keys',
    type: KeyListResponse,
  })
  @ApiOperation({ summary: 'Get list of found keys in DB from pubkey list' })
  getByPubkeys(@Body() keys: KeysFindBody) {
    return this.keysService.getByPubkeys(keys.pubkeys);
  }
}
