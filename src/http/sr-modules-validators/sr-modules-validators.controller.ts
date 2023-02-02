import { Controller, Get, Version, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SRModulesValidatorsService } from './sr-modules-validators.service';
import { ModuleId } from 'http/common/entities/';
import { Query as ValidatorsQuery } from './entities/query';
import { ExitPresignMessageListResponse, ExitValidatorListResponse } from './entities';

@Controller('modules')
@ApiTags('validators')
export class SRModulesValidatorsController {
  constructor(protected readonly validatorsService: SRModulesValidatorsService) {}

  @Version('1')
  @Get(':module_id/validators/exits_presign/:operator_id')
  @ApiOperation({ summary: 'Get list of N oldest lido validators' })
  @ApiResponse({
    status: 200,
    description: 'Staking Router module keys.',
    type: ExitValidatorListResponse,
  })
  @ApiParam({
    name: 'module_id',
    example: '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
    description: 'Staking router module_id or contract address.',
  })
  @ApiParam({
    name: 'operator_id',
    description: 'Operator index',
  })
  getOldestValidators(
    @Param('module_id') moduleId: ModuleId,
    @Param('operator_id') operatorId,
    @Query() query: ValidatorsQuery,
  ) {
    return this.validatorsService.getOldestLidoValidators(moduleId, operatorId, query);
  }

  @Version('1')
  @Get(':module_id/validators/exits_presign/:operator_id/messages')
  @ApiOperation({ summary: 'Get list of N oldest lido validators' })
  @ApiResponse({
    status: 200,
    description: 'Staking Router module keys.',
    type: ExitPresignMessageListResponse,
  })
  @ApiParam({
    name: 'module_id',
    example: '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
    description: 'Staking router module_id or contract address.',
  })
  @ApiParam({
    name: 'operator_id',
    description: 'Operator index',
  })
  getMessagesForOldestValidators(
    @Param('module_id') moduleId: ModuleId,
    @Param('operator_id') operatorId,
    @Query() query: ValidatorsQuery,
  ) {
    return this.validatorsService.getVoluntaryExitMessages(moduleId, operatorId, query);
  }
}
