import {
  registerDecorator,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { isHexString } from 'ethers/lib/utils';

@ValidatorConstraint({ name: 'IsPubkeyConstraint', async: false })
export class IsPubkeyConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [isEach] = args.constraints as [boolean];

    const isValid = (val: any): boolean => typeof val === 'string' && val.startsWith('0x') && isHexString(val, 48);

    if (isEach && Array.isArray(value)) {
      return value.every((v) => isValid(v));
    }

    return isValid(value);
  }

  defaultMessage() {
    return `Each pubkey must be a valid 0x-prefixed 48-byte hex string`;
  }
}

export function IsPubkey(validationOptions?: ValidationOptions) {
  const each = validationOptions?.each === true;

  return function (object: Record<string, any>, propertyName: string) {
    registerDecorator({
      name: 'IsPubkey',
      target: object.constructor,
      propertyName,
      constraints: [each],
      options: validationOptions,
      validator: IsPubkeyConstraint,
    });
  };
}
