import { Controller, Get, Version, Param, Query, Body, Post, NotFoundException, HttpStatus } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SRModuleKeyListResponse, GroupedByModuleKeyListResponse } from './entities';
import { SRModulesKeysService } from './sr-modules-keys.service';
import { ModuleId, KeyQuery } from 'http/common/entities/';
import { KeysFindBody } from 'http/common/entities/pubkeys';
import { TooEarlyResponse } from 'http/common/entities/http-exceptions';

@Controller('modules')
@ApiTags('sr-module-keys')
export class SRModulesKeysController {
  constructor(protected readonly srModulesService: SRModulesKeysService) {}

  @Version('1')
  @ApiOperation({ summary: 'Get keys for all modules grouped by staking router module.' })
  @ApiResponse({
    status: 200,
    description: 'Keys for all modules grouped by staking router module.',
    type: GroupedByModuleKeyListResponse,
  })
  @ApiResponse({
    status: 425,
    description: "Meta is null, maybe data hasn't been written in db yet",
    type: TooEarlyResponse,
  })
  @Get('keys')
  getGroupedByModuleKeys(@Query() filters: KeyQuery) {
    return this.srModulesService.getGroupedByModuleKeys(filters);
  }

  @Version('1')
  @ApiOperation({ summary: 'Staking router module keys.' })
  @ApiResponse({
    status: 200,
    description: 'List of all modules supported in API',
    type: SRModuleKeyListResponse,
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
  @Get(':module_id/keys')
  getModuleKeys(@Param('module_id') moduleId: ModuleId, @Query() filters: KeyQuery) {
    return this.srModulesService.getModuleKeys(moduleId, filters);
  }

  @Version('1')
  @Post(':module_id/keys/find')
  @ApiOperation({ summary: 'Get list of found staking router module keys in db from pubkey list.' })
  @ApiResponse({
    status: 200,
    description: 'Staking Router module keys.',
    type: SRModuleKeyListResponse,
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
  getModuleKeysByPubkeys(@Param('module_id') moduleId: ModuleId, @Body() keys: KeysFindBody) {
    return this.srModulesService.getModuleKeysByPubkeys(moduleId, keys.pubkeys);
  }
}
