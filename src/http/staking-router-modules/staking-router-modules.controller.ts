import { Controller, Get, Version } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StakingRouterModuleResponse } from './entities';
import { StakingRouterModulesService } from './staking-router-modules.service';

@Controller('modules')
@ApiTags('List of Modules')
export class StakingRouterModulesController {
  constructor(protected readonly modulesService: StakingRouterModulesService) {}

  @Version('1')
  @ApiOperation({ summary: 'Get list of modules supported in API' })
  @ApiResponse({
    status: 200,
    description: 'List of all modules supported in API',
    type: StakingRouterModuleResponse,
  })
  @Get('/')
  get() {
    return this.modulesService.get();
  }
}
