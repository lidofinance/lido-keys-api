import { Controller, Get, Version, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import {
  GroupedByModuleOperatorListResponse,
  SRModuleOperatorListResponse,
  SRModuleOperatorResponse,
} from './entities';
import { ModuleId } from 'http/common/entities/';
import { SRModulesOperatorsService } from './sr-modules-operators.service';
import { OperatorIdParam } from 'http/common/entities/operator-id-param';

@Controller('/')
@ApiTags('operators')
export class SRModulesOperatorsController {
  constructor(protected readonly srModulesOperators: SRModulesOperatorsService) {}

  @Version('1')
  @ApiOperation({ summary: 'Get operators for all modules grouped by staking router module.' })
  @ApiResponse({
    status: 200,
    description: 'Operators for all modules grouped by staking router module.',
    type: () => GroupedByModuleOperatorListResponse,
  })
  @Get('/operators')
  get() {
    return this.srModulesOperators.getAll();
  }

  @Version('1')
  @ApiOperation({ summary: 'Staking router module operators.' })
  @ApiResponse({
    status: 200,
    description: 'List of all SR module operators',
    type: SRModuleOperatorListResponse,
  })
  @ApiParam({
    name: 'module_id',
    description: 'Staking router module_id or contract address.',
  })
  @Get('modules/:module_id/operators')
  getModuleOperators(@Param('module_id') moduleId: ModuleId) {
    return this.srModulesOperators.getByModule(moduleId);
  }

  @Version('1')
  @ApiOperation({ summary: 'Staking router module operator.' })
  @ApiResponse({
    status: 200,
    description: 'SR module operator',
    type: SRModuleOperatorResponse,
  })
  @ApiParam({
    name: 'module_id',
    description: 'Staking router module_id or contract address.',
  })
  @Get('modules/:module_id/operators/:operator_id')
  // here should be validaton
  getModuleOperator(@Param('module_id') moduleId: ModuleId, @Param() operator: OperatorIdParam) {
    return this.srModulesOperators.getModuleOperator(moduleId, operator.operator_id);
  }
}
