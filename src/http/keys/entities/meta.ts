import { ApiProperty } from '@nestjs/swagger';

export class Meta {
  @ApiProperty()
  blockNumber: number;
  @ApiProperty()
  blockHash: string;
}
