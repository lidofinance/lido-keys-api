import { Controller, Get, Version, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Status } from './entities';
import { StatusService } from './status.service';

@Controller('/status')
@ApiTags('status')
export class StatusController {
  constructor(protected readonly status: StatusService) {}

  @Version('1')
  @ApiOperation({ summary: 'Get status of Keys API' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Keys API status',
    type: () => Status,
  })
  @Get('/')
  get() {
    return this.status.get();
  }
}
