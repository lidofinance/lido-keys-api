import { ApiProperty } from '@nestjs/swagger';

export enum STAKING_ROUTER_MODULE_FIELDS {
  DEPOSIT_SIGNATURE = 'depositSignature',
  USED = 'used',
  OPERATOR_INDEX = 'operatorIndex',
  KEY_INDEX = 'index',
}

export class StakingRouterModuleKeysQuery {
  @ApiProperty({
    name: 'fields',
    required: false,
    description:
      'List of fields that should be included in response. Some fields will be included not for all kinds of modules.',
    isArray: true,
    enum: STAKING_ROUTER_MODULE_FIELDS,
  })
  fields?: STAKING_ROUTER_MODULE_FIELDS[];
}
