import { Controller, Get, Post, Version, Query, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { KeysService } from './keys.service';
import {
  KeysQuery,
  StakingRouterModuleKeysResponse,
  GENERAL_FIELDS,
  STAKING_ROUTER_MODULE_FIELDS,
  StakingRouterModuleKeysQuery,
} from './entities';
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
  @ApiOperation({ summary: 'Get list of keys' })
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
  @ApiOperation({ summary: 'Get list of found keys in db from pubkey list' })
  getByPubkeys(@Body() pubkeys: string[], @Query() query: KeysQuery) {
    const fields = prepareQuery(query.fields, Object.values(GENERAL_FIELDS));
    return this.keysService.getByPubKeys(fields, pubkeys);
  }

  @Version('1')
  @ApiParam({
    name: 'module_address',
    example: '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
    description: "Staking Router module's contract address.",
  })
  @ApiQuery({
    name: 'used',
    required: false,
    description: 'Filter to get used keys. Possible values: true/false',
  })
  @Get(':module_address')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of keys for module',
    type: StakingRouterModuleKeysResponse,
  })
  @ApiOperation({ summary: 'Get list of keys for module' })
  getForModule(
    @Param('module_address') module_address: string,
    @Query() query: StakingRouterModuleKeysQuery,
    @Query('used') used?: boolean,
  ) {
    const filteredFields = prepareQuery(query.fields, Object.values(STAKING_ROUTER_MODULE_FIELDS));
    return this.keysService.getForModule(module_address, filteredFields, used);
  }

  @Version('1')
  @ApiParam({
    name: 'module_address',
    example: '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
    description: "Staking Router module's contract address.",
  })
  @Post(':module_address')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns all keys found in db from pubkey list for module',
    type: StakingRouterModuleKeysResponse,
  })
  @ApiOperation({ summary: 'Get list of found keys in db from pubkey list for module' })
  getForModuleByPubkeys(
    @Param('module_address') module_address: string,
    @Body() pubkeys: string[],
    @Query() query: StakingRouterModuleKeysQuery,
  ) {
    const filteredFields = prepareQuery(query.fields, Object.values(STAKING_ROUTER_MODULE_FIELDS));
    return this.keysService.getForModuleByPubkeys(module_address, filteredFields, pubkeys);
  }
}
