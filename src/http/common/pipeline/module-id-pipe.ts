import { BadRequestException, PipeTransform } from '@nestjs/common';
import { isAddress } from 'ethers/lib/utils';

export class ModuleIdPipe implements PipeTransform<string, string | number> {
  transform(value: string) {
    const trimmedValue = value.trim();

    if (isAddress(trimmedValue)) {
      return trimmedValue.toLowerCase();
    }

    const nonNegativeIntegerRegex = /^(0|[1-9]\d*)$/;

    if (nonNegativeIntegerRegex.test(trimmedValue)) {
      return Number(trimmedValue);
    }

    throw new BadRequestException([`module_id must be a contract address or numeric value`]);
  }
}
