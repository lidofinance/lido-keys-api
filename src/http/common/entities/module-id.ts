import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { isAddress } from 'ethers/lib/utils';

function toModuleId(moduleId: string): string | number {
  if (isAddress(moduleId)) {
    return moduleId.toLowerCase();
  }

  if (Number(moduleId)) {
    return Number(moduleId);
  }

  throw new BadRequestException([`module_id must be a contract address or numeric value`]);
}

export class ModuleId {
  @ApiProperty({
    name: 'module_id',
    description: "Staking modules' numeric id or contract module address",
  })
  @Transform(({ value }) => toModuleId(value))
  module_id!: string | number;
}
