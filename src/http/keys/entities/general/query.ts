import { ApiProperty } from '@nestjs/swagger';

export enum GENERAL_FIELDS {
  SIGNATURE = 'depositSignature',
}

export class KeysQuery {
  @ApiProperty({
    name: 'fields',
    required: false,
    description: 'List of fields that should be included in response.',
    isArray: true,
    enum: GENERAL_FIELDS,
  })
  fields: GENERAL_FIELDS[];
}
