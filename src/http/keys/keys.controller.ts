import { Controller, Get, Version, Query, Param } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { KeysService } from './keys.service';
import { KeysQuery } from './entities';
import { AllKeysResponse, KeyResponse } from './entities';
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
    type: () => AllKeysResponse,
  })
  getAll(@Query() query: KeysQuery) {
    const fields = toList(query.fields);
    return this.keysService.getAll(fields);
  }

  @Version('1')
  @Get(':pubkey')
  @ApiResponse({
    status: 200,
    description: 'Return key by pubkey',
    type: () => KeyResponse,
  })
  getOne(@Query() query: KeysQuery, @Param('pubkey') pubkey: string) {
    const fields = toList(query.fields);
    return this.keysService.getByPubKey(fields, pubkey);
  }
}
