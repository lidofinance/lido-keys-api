import { Controller, Get, Version, Param, HttpStatus, NotFoundException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiParam, ApiNotFoundResponse } from '@nestjs/swagger';
import {
  GroupedByModuleOperatorListResponse,
  SRModuleOperatorListResponse,
  SRModuleOperatorResponse,
} from './entities';
import { SRModulesOperatorsService } from './sr-modules-operators.service';
import { OperatorId } from '../common/entities/operator-id';
import { TooEarlyResponse } from '../common/entities/http-exceptions';
import { ModuleIdPipe } from '../common/pipeline/module-id-pipe';

@Controller('/')
@ApiTags('operators')
export class SRModulesOperatorsController {
  constructor(protected readonly srModulesOperators: SRModulesOperatorsService) {}

  @Version('1')
  @ApiOperation({ summary: 'Get operators for all modules grouped by staking router module' })
  @ApiResponse({
    status: 200,
    description: 'Operators for all modules grouped by staking router module',
    type: () => GroupedByModuleOperatorListResponse,
  })
  @ApiResponse({
    status: 425,
    description: "Meta is null, maybe data hasn't been written in db yet",
    type: TooEarlyResponse,
  })
  @Get('/operators')
  get() {
    return this.srModulesOperators.getAll();
  }

  @Version('1')
  @ApiOperation({ summary: 'Staking router module operators' })
  @ApiResponse({
    status: 200,
    description: 'List of all SR module operators',
    type: SRModuleOperatorListResponse,
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
    type: String,
    description: 'Staking router module_id or contract address',
  })
  @Get('modules/:module_id/operators')
  getModuleOperators(@Param('module_id', ModuleIdPipe) module_id: string | number) {
    return this.srModulesOperators.getByModule(module_id);
  }

  @Version('1')
  @ApiOperation({ summary: 'Staking router module operator' })
  @ApiResponse({
    status: 200,
    description: 'SR module operator',
    type: SRModuleOperatorResponse,
  })
  @ApiResponse({
    status: 425,
    description: "Meta is null, maybe data hasn't been written in db yet",
    type: TooEarlyResponse,
  })
  @ApiNotFoundResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Provided module or operator are not supported',
    type: NotFoundException,
  })
  @ApiParam({
    name: 'module_id',
    type: String,
    description: 'Staking router module_id or contract address',
  })
  @Get('modules/:module_id/operators/:operator_id')
  getModuleOperator(@Param('module_id', ModuleIdPipe) module_id: string | number, @Param() operator: OperatorId) {
    return this.srModulesOperators.getModuleOperator(module_id, operator.operator_id);
  }
}
