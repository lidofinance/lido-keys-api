import { Controller, Get, Version, Param, Query, HttpStatus, NotFoundException } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SRModulesValidatorsService } from './sr-modules-validators.service';
import { ModuleId } from 'http/common/entities/';
import { Query as ValidatorsQuery } from './entities/query';
import { ExitPresignMessageListResponse, ExitValidatorListResponse } from './entities';
import { OperatorIdParam } from 'http/common/entities/operator-id-param';
import { TooEarlyResponse } from 'http/common/entities/http-exceptions';

@Controller('modules')
@ApiTags('validators')
export class SRModulesValidatorsController {
  constructor(protected readonly validatorsService: SRModulesValidatorsService) {}

  @Version('1')
  @Get(':module_id/validators/validator-exits-to-prepare/:operator_id')
  @ApiOperation({ summary: 'Get list of N oldest lido validators' })
  @ApiResponse({
    status: 200,
    description: 'N oldest lido validators for operator.',
    type: ExitValidatorListResponse,
  })
  @ApiResponse({
    status: 425,
    description: 'Too early response',
    type: TooEarlyResponse,
  })
  @ApiNotFoundResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Provided module or operator are not supported',
    type: NotFoundException,
  })
  @ApiParam({
    name: 'module_id',
    example: '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
    description: 'Staking router module_id or contract address.',
  })
  getOldestValidators(
    @Param('module_id') moduleId: ModuleId,
    @Param() operator: OperatorIdParam,
    @Query() query: ValidatorsQuery,
  ) {
    return this.validatorsService.getOldestLidoValidators(moduleId, operator.operator_id, query);
  }

  @Version('1')
  @Get(':module_id/validators/generate-unsigned-exit-messages/:operator_id')
  @ApiOperation({ summary: 'Get list of exit messages for N oldest lido validators' })
  @ApiResponse({
    status: 200,
    description: 'Exit messages for N oldest lido validators of operator',
    type: ExitPresignMessageListResponse,
  })
  @ApiResponse({
    status: 425,
    description: 'Too early response',
    type: TooEarlyResponse,
  })
  @ApiNotFoundResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Provided module or operator are not supported',
    type: NotFoundException,
  })
  @ApiParam({
    name: 'module_id',
    example: '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
    description: 'Staking router module_id or contract address.',
  })
  getMessagesForOldestValidators(
    @Param('module_id') moduleId: ModuleId,
    @Param() operator: OperatorIdParam,
    @Query() query: ValidatorsQuery,
  ) {
    return this.validatorsService.getVoluntaryExitMessages(moduleId, operator.operator_id, query);
  }
}
