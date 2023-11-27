import {
  Controller,
  Get,
  Version,
  Param,
  Query,
  HttpStatus,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SRModulesValidatorsService } from './sr-modules-validators.service';
import { ValidatorsQuery } from './entities/query';
import { ExitPresignMessageListResponse, ExitValidatorListResponse } from './entities';
import { OperatorId } from '../common/entities/operator-id';
import { TooEarlyResponse } from '../common/entities/http-exceptions';
import { ModuleIdPipe } from '../common/pipeline/module-id-pipe';

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
    description: "Meta is null, maybe data hasn't been written in db yet",
    type: TooEarlyResponse,
  })
  @ApiNotFoundResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Provided module or operator are not supported',
    type: NotFoundException,
  })
  @ApiInternalServerErrorResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Disabled endpoint/ Last Execution Layer block number in our database older than last Consensus Layer',
    type: InternalServerErrorException,
  })
  @ApiParam({
    name: 'module_id',
    type: String,
    description: 'Staking router module_id or contract address.',
  })
  getOldestValidators(
    @Param('module_id', ModuleIdPipe) module_id: string | number,
    @Param() operator: OperatorId,
    @Query() query: ValidatorsQuery,
  ) {
    return this.validatorsService.getOldestLidoValidators(module_id, operator.operator_id, query);
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
    description: "Meta is null, maybe data hasn't been written in db yet",
    type: TooEarlyResponse,
  })
  @ApiNotFoundResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Provided module or operator are not supported',
    type: NotFoundException,
  })
  @ApiInternalServerErrorResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Disabled endpoint/ Last Execution Layer block number in our database older than last Consensus Layer',
    type: InternalServerErrorException,
  })
  @ApiParam({
    name: 'module_id',
    type: String,
    description: 'Staking router module_id or contract address.',
  })
  getMessagesForOldestValidators(
    @Param('module_id', ModuleIdPipe) module_id: string | number,
    @Param() operator: OperatorId,
    @Query() query: ValidatorsQuery,
  ) {
    return this.validatorsService.getVoluntaryExitMessages(module_id, operator.operator_id, query);
  }
}
