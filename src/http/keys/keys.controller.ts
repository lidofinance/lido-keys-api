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
  ParseArrayPipe,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { KeysService } from './keys.service';
import { KeyListResponse } from './entities';
import { KeyQuery } from 'http/common/entities';

@Controller('keys')
@ApiTags('keys')
export class KeysController {
  constructor(protected readonly keysService: KeysService) {}

  @Version('1')
  @Get('/')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all keys',
    type: KeyListResponse,
  })
  @ApiQuery({
    name: 'used',
    required: false,
    description: 'Filter to get used keys. Possible values: true/false',
  })
  @ApiOperation({ summary: 'Get list of all keys' })
  get(@Query() filters: KeyQuery) {
    return this.keysService.get(filters);
  }

  @Version('1')
  @Get(':pubkey')
  @ApiParam({
    name: 'pubkey',
    description: 'Public key',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all keys',
    type: KeyListResponse,
  })
  @ApiOperation({ summary: 'Get detailed information about pubkey' })
  getByPubkey(@Param('pubkey') pubkey: string) {
    return this.keysService.getByPubkey(pubkey);
  }

  @Version('1')
  @Post('/find')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Staking Router module keys.',
    type: KeyListResponse,
  })
  @ApiOperation({ summary: 'Get list of found keys in db from pubkey list' })
  getByPubkeys(@Body(new ParseArrayPipe({ items: String })) pubkeys: string[]) {
    return this.keysService.getByPubkeys(pubkeys);
  }
}
