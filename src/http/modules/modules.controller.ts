import { Controller, Get, Version } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ModuleResponse } from './entities';
import { ModulesService } from './modules.service';

@Controller('modules')
@ApiTags('List of Modules')
export class ModulesController {
  constructor(protected readonly modulesService: ModulesService) {}

  @Version('1')
  @ApiOperation({ summary: 'Get list of modules supported in API' })
  @ApiResponse({
    status: 200,
    description: 'List of all modules supported in API',
    type: ModuleResponse,
  })
  @Get('/')
  get() {
    return this.modulesService.get();
  }
}
