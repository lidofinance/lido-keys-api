import { Controller, Get, Version, Param, HttpStatus, NotFoundException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { SRModuleOperatorListResponseV2 } from './entities';
import { SRModulesOperatorsV2Service } from './sr-modules-operators-v2.service';
import { TooEarlyResponse } from '../common/entities/http-exceptions';
import { ModuleIdPipe } from '../common/pipeline/module-id-pipe';

@Controller('/')
@ApiTags('operators')
export class SRModulesOperatorsV2Controller {
  constructor(protected readonly srModulesOperators: SRModulesOperatorsV2Service) {}

  @Version('2')
  @ApiOperation({
    summary: 'Staking router module operators (community-onchain-v1, curated-onchain-v2 module types only)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of SR module operators for community-onchain-v1 and curated-onchain-v2 module types',
    type: SRModuleOperatorListResponseV2,
  })
  @ApiResponse({
    status: 425,
    description: "Meta is null, maybe data hasn't been written in db yet",
    type: TooEarlyResponse,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Provided module is not supported or its type is not community-onchain-v1 / curated-onchain-v2',
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
}
