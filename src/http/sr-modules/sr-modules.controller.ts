import { Controller, Get, Version, Param, Query, Body, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  SRModuleListResponse,
  SRModuleResponse,
  SRModuleKeysResponse,
  GroupedByModuleKeyListResponse,
  FilterQuery,
} from './entities';
import { SRModulesService } from './sr-modules.service';
import { ModuleId } from 'http/common/entities/';

@Controller('modules')
@ApiTags('List of Modules')
export class SRModulesController {
  constructor(protected readonly modulesService: SRModulesService) {}

  @Version('1')
  @ApiOperation({ summary: 'Get list of modules supported in API.' })
  @ApiResponse({
    status: 200,
    description: 'List of all modules supported in API',
    type: SRModuleListResponse,
  })
  @Get('/')
  getModules() {
    return this.modulesService.getModules();
  }

  @Version('1')
  @ApiOperation({ summary: 'Get detailed information about staking router module.' })
  @ApiResponse({
    status: 200,
    description: 'Staking router module detailed information.',
    type: SRModuleResponse,
  })
  @Get(':module_id')
  @ApiParam({
    name: 'module_id',
    description: 'Staking router module_id or contract address.',
  })
  getModule(@Param('module_id') moduleId: ModuleId) {
    return this.modulesService.getModule(moduleId);
  }

  @Version('1')
  @ApiOperation({ summary: 'Get keys for all modules grouped by staking router module.' })
  @ApiResponse({
    status: 200,
    description: 'Keys for all modules grouped by staking router module.',
    type: GroupedByModuleKeyListResponse,
  })
  @Get('keys')
  getGroupedByModuleKeys(@Query() filters: FilterQuery) {
    return this.modulesService.getGroupedByModuleKeys(filters);
  }

  @Version('1')
  @ApiOperation({ summary: 'Staking router module keys.' })
  @ApiResponse({
    status: 200,
    description: 'List of all modules supported in API',
    type: SRModuleKeysResponse,
  })
  @ApiParam({
    name: 'module_id',
    description: 'Staking router module_id or contract address.',
  })
  @Get(':module_id/keys')
  getModuleKeys(@Param('module_id') moduleId: ModuleId, @Query() filters: FilterQuery) {
    return this.modulesService.getModuleKeys(moduleId, filters);
  }

  @Version('1')
  @Post(':module_id/keys/find')
  @ApiOperation({ summary: 'Get list of found staking router module keys in db from pubkey list.' })
  @ApiResponse({
    status: 200,
    description: 'Staking Router module keys.',
    type: SRModuleKeysResponse,
  })
  @ApiParam({
    name: 'module_id',
    description: 'Staking router module_id or contract address.',
  })
  getModuleKeysByPubkeys(@Param('module_id') module_id: ModuleId, @Body() pubkeys: string[]) {
    return this.modulesService.getModuleKeysByPubkeys(module_id, pubkeys);
  }
}
