import { ApiProperty } from '@nestjs/swagger';

export enum FIELDS {
  SIGNATURE = 'signature',
}

export class KeysQuery {
  @ApiProperty({
    name: 'fields',
    required: false,
    description: 'List of fields that should be included in response.',
    isArray: true,
    enum: FIELDS,
  })
  fields: FIELDS[];
}
