import { BadRequestException, PipeTransform } from '@nestjs/common';
import { isAddress } from 'ethers/lib/utils';
import { AddressZero } from '@ethersproject/constants';

export class ModuleIdPipe implements PipeTransform<string, string | number> {
  transform(value: string) {
    const trimmedValue = value.trim();

    if (isAddress(trimmedValue)) {
      const normalized = trimmedValue.toLowerCase();

      if (normalized === AddressZero) {
        throw new BadRequestException(['module_id cannot be the zero address']);
      }

      return normalized;
    }

    const nonNegativeIntegerRegex = /^(0|[1-9]\d*)$/;

    if (nonNegativeIntegerRegex.test(trimmedValue)) {
      return Number(trimmedValue);
    }

    throw new BadRequestException(['module_id must be a contract address or numeric value']);
  }
}
