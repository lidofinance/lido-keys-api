import { BadRequestException, PipeTransform } from '@nestjs/common';
import { isAddress } from 'ethers/lib/utils';

//or T - string?
export class ModuleIdPipe implements PipeTransform<string, string | number> {
  transform(value: string) {
    if (isAddress(value)) {
      return value.toLowerCase();
    }

    if (Number(value)) {
      return Number(value);
    }

    throw new BadRequestException([`module_id must be a contract address or numeric value`]);
  }
}
