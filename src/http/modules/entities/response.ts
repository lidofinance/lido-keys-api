import { ApiProperty } from '@nestjs/swagger';
import { Module } from './module';

export class ModuleResponse {
  @ApiProperty({
    type: () => [Module],
  })
  data: Module[];
}
