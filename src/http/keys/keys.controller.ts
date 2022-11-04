import { Controller, Get, Post, Version, Query, Body } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { KeysService } from './keys.service';
import { KeysQuery } from './entities';
import { KeysResponse } from './entities';
import { toList } from '../common/utils';

@Controller('keys')
@ApiTags('Operators keys')
export class KeysController {
  constructor(protected readonly keysService: KeysService) {}

  @Version('1')
  @Get('/')
  @ApiResponse({
    status: 200,
    description: 'Get list of all keys',
    type: () => KeysResponse,
  })
  getAll(@Query() query: KeysQuery) {
    const fields = toList(query.fields);
    return this.keysService.getAll(fields);
  }

  @Version('1')
  @Post()
  @ApiResponse({
    status: 200,
    description: 'Returns all keys found in db from pubkey list',
    type: () => KeysResponse,
  })
  getAllByPubkeys(@Body() pubkeys: string[], @Query() query: KeysQuery) {
    const fields = toList(query.fields);
    return this.keysService.getByPubKeys(fields, pubkeys);
  }
}
