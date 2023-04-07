import { Controller, Get, Version, Param, Query, NotFoundException, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiParam, ApiNotFoundResponse } from '@nestjs/swagger';
import { SRModuleOperatorsKeysResponse } from './entities';
import { ModuleId, KeyQuery } from 'http/common/entities/';
import { SRModulesOperatorsKeysService } from './sr-modules-operators-keys.service';
import { TooEarlyResponse } from 'http/common/entities/http-exceptions';

@Controller('/modules')
@ApiTags('operators-keys')
export class SRModulesOperatorsKeysController {
  constructor(protected readonly srModulesOperatorsKeys: SRModulesOperatorsKeysService) {}

  @Version('1')
  @ApiOperation({ summary: 'Staking router module operators.' })
  @ApiResponse({
    status: 200,
    description: 'List of all SR module operators',
    type: SRModuleOperatorsKeysResponse,
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
  @Get(':module_id/operators/keys')
  getOperatorsKeys(@Param('module_id') moduleId: ModuleId, @Query() filters: KeyQuery) {
    return this.srModulesOperatorsKeys.get(moduleId, filters);
  }
}
