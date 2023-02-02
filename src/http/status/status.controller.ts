import { Controller, Get, Version } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Status } from './entities';
import { StatusService } from './status.service';

@Controller('/status')
@ApiTags('status')
export class StatusController {
  constructor(protected readonly status: StatusService) {}

  @Version('1')
  @ApiOperation({ summary: 'Get status of API' })
  @ApiResponse({
    status: 200,
    description: 'API status',
    type: () => Status,
  })
  @Get('/')
  get() {
    return this.status.get();
  }
}
