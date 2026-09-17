import { Controller, Get, Version, Param, HttpStatus, NotFoundException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { SRModuleCompoundingOperatorListResponse } from './entities';
import { SRModulesCompoundingOperatorsService } from './sr-modules-compounding-operators.service';
import { TooEarlyResponse } from '../common/entities/http-exceptions';
import { ModuleIdPipe } from '../common/pipeline/module-id-pipe';

@Controller('/')
@ApiTags('operators')
export class SRModulesCompoundingOperatorsController {
  constructor(protected readonly srModulesCompoundingOperators: SRModulesCompoundingOperatorsService) {}

  @Version('2')
  @ApiOperation({ summary: 'Operators of a compounding (0x02) staking router module' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of operators of a compounding (0x02) SR module, including totalWithdrawnKeys',
    type: SRModuleCompoundingOperatorListResponse,
  })
  @ApiResponse({
    status: 425,
    description: "Meta is null, maybe data hasn't been written in db yet",
    type: TooEarlyResponse,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Provided module is not supported or is not a compounding (0x02) module',
    type: NotFoundException,
  })
  @ApiParam({
    name: 'module_id',
    type: String,
    description: 'Staking router module_id or contract address',
  })
  @Get('modules/:module_id/compounding-operators')
  getModuleCompoundingOperators(@Param('module_id', ModuleIdPipe) module_id: string | number) {
    return this.srModulesCompoundingOperators.getByModule(module_id);
  }
}
