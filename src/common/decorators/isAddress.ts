import {
  registerDecorator,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { isAddress as isAddressValidation } from 'ethers/lib/utils';

@ValidatorConstraint({ name: 'IsAddressConstraint', async: false })
export class IsAddressConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments): boolean {
    const [isEach] = args.constraints as [boolean];

    const isValid = (val: any): boolean => typeof val === 'string' && isAddressValidation(val);

    if (isEach && Array.isArray(value)) {
      return value.every(isValid);
    }

    return isValid(value);
  }

  defaultMessage() {
    return `Each value must be a valid address`;
  }
}

export function IsAddress(validationOptions?: ValidationOptions) {
  const each = validationOptions?.each === true;

  return function (object: Record<string, any>, propertyName: string) {
    registerDecorator({
      name: 'IsAddress',
      target: object.constructor,
      propertyName,
      constraints: [each],
      options: validationOptions,
      validator: IsAddressConstraint,
    });
  };
}
