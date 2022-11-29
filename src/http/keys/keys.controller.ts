import { Controller, Get, Post, Version, Query, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { KeysService } from './keys.service';
import { KeysQuery, ModuleKeysResponse, ModuleKeysQuery, GENERAL_FIELDS, MODULE_FIELDS } from './entities';
import { KeysResponse } from './entities';
import { prepareQuery } from '../common/utils';

@Controller('keys')
@ApiTags('Operators keys')
export class KeysController {
  constructor(protected readonly keysService: KeysService) {}

  @Version('1')
  @Get('/')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all keys',
    type: KeysResponse,
  })
  get(@Query() query: KeysQuery) {
    const fields = prepareQuery(query.fields, Object.values(GENERAL_FIELDS));
    return this.keysService.get(fields);
  }

  @Version('1')
  @Post('/find')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns all keys found in db from pubkey list',
    type: KeysResponse,
  })
  getByPubkeys(@Body() pubkeys: string[], @Query() query: KeysQuery) {
    const fields = prepareQuery(query.fields, Object.values(GENERAL_FIELDS));
    return this.keysService.getByPubKeys(fields, pubkeys);
  }

  @Version('1')
  @ApiParam({ name: 'module_address', example: 1, description: "Staking router module's contract address." })
  @Get(':module_address')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of keys for module',
    type: ModuleKeysResponse,
  })
  @ApiOperation({ summary: 'Get list of keys for module' })
  getForModule(@Param('module_address') module_address: string, @Query() query: ModuleKeysQuery) {
    const fields = prepareQuery(query.fields, Object.values(MODULE_FIELDS));
    return this.keysService.getForModule(module_address, fields, query.used);
  }
}
