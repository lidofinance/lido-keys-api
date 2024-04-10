import { Controller, Get, Version, Param, HttpStatus, NotFoundException } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SRModuleListResponse, SRModuleResponse } from './entities';
import { SRModulesService } from './sr-modules.service';
import { TooEarlyResponse } from '../common/entities/http-exceptions';
import { ModuleIdPipe } from '../common/pipeline/module-id-pipe';

@Controller('modules')
@ApiTags('modules')
export class SRModulesController {
  constructor(protected readonly srModulesService: SRModulesService) {}

  @Version('1')
  @ApiOperation({ summary: 'Get list of modules supported in API' })
  @ApiResponse({
    status: 200,
    description: 'List of all modules supported in API',
    type: SRModuleListResponse,
  })
  @ApiResponse({
    status: 425,
    description: "Meta is null, maybe data hasn't been written in db yet",
    type: TooEarlyResponse,
  })
  @Get('/')
  getModules() {
    return this.srModulesService.getModules();
  }

  @Version('1')
  @ApiOperation({ summary: 'Get detailed information about staking router module' })
  @ApiResponse({
    status: 200,
    description: 'Staking router module detailed information',
    type: SRModuleResponse,
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
  @Get(':module_id')
  @ApiParam({
    name: 'module_id',
    type: String,
    description: 'Staking router module_id or contract address',
  })
  getModule(@Param('module_id', ModuleIdPipe) module_id: string | number) {
    return this.srModulesService.getModule(module_id);
  }
}
