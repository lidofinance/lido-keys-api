import { ApiProperty } from '@nestjs/swagger';

export enum MODULE_FIELDS {
  SIGNATURE = 'depositSignature',
  USED = 'used',
  OPERATOR_INDEX = 'operatorIndex',
  KEY_INDEX = 'index',
}

export class ModuleKeysQuery {
  @ApiProperty({
    name: 'fields',
    required: false,
    description:
      'List of fields that should be included in response. Some fields will be included not for all kinds of modules.',
    isArray: true,
    enum: MODULE_FIELDS,
  })
  fields?: MODULE_FIELDS[];
}
