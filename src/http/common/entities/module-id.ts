import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

function toModuleId(moduleId: string): string | number {
  if (isContractAddress(moduleId)) {
    return moduleId;
  }

  if (Number(moduleId)) {
    return Number(moduleId);
  }

  throw new BadRequestException([`module_id must be a contract address or numeric value`]);
}

export function isContractAddress(address: string): boolean {
  const contractAddressRegex = /^0x[0-9a-fA-F]{40}$/;
  return contractAddressRegex.test(address);
}

export class ModuleId {
  @ApiProperty({
    name: 'module_id',
    description: "Staking modules' numeric id or contract module address",
  })
  @Transform(({ value }) => toModuleId(value))
  module_id!: string | number;
}
