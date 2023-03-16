import { Controller, Get, Version, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SRModuleListResponse, SRModuleResponse } from './entities';
import { SRModulesService } from './sr-modules.service';
import { ModuleId } from 'http/common/response-entities';

@Controller('modules')
@ApiTags('modules')
export class SRModulesController {
  constructor(protected readonly srModulesService: SRModulesService) {}

  @Version('1')
  @ApiOperation({ summary: 'Get list of modules supported in API.' })
  @ApiResponse({
    status: 200,
    description: 'List of all modules supported in API',
    type: SRModuleListResponse,
  })
  @Get('/')
  getModules() {
    return this.srModulesService.getModules();
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
    return this.srModulesService.getModule(moduleId);
  }
}
