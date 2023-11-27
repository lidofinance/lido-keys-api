import { ModuleIdPipe } from './module-id-pipe';
import { BadRequestException } from '@nestjs/common';

describe('ModuleIdPipe', () => {
  let moduleIdPipe: ModuleIdPipe;

  beforeEach(() => {
    moduleIdPipe = new ModuleIdPipe();
  });

  it('should throw a BadRequestException for invalid address', () => {
    const invalidAddress = '0xn5032650b14df07b85bF18A3a3eC8E0Af2e028d5';
    expect(() => moduleIdPipe.transform(invalidAddress)).toThrowError(
      new BadRequestException([`module_id must be a contract address or numeric value`]),
    );
  });

  it('should transform a valid Ethereum address to lowercase', () => {
    const validAddress = '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5';

    expect(moduleIdPipe.transform(validAddress)).toBe('0x55032650b14df07b85bf18a3a3ec8e0af2e028d5');
  });

  it('should transform a valid numeric string to a number', () => {
    const numericString = '12345';

    expect(moduleIdPipe.transform(numericString)).toBe(12345);
  });

  it('should throw a BadRequestException for an invalid input', () => {
    const invalidInput = 'invalid-input';
    expect(() => moduleIdPipe.transform(invalidInput)).toThrowError(
      new BadRequestException([`module_id must be a contract address or numeric value`]),
    );
  });

  it('should throw a BadRequestException for an empty string', () => {
    const emptyString = '';

    expect(() => moduleIdPipe.transform(emptyString)).toThrowError(
      new BadRequestException([`module_id must be a contract address or numeric value`]),
    );
  });

  it('should throw a BadRequestException for a negative number', () => {
    const negativeNumber = '-10';

    expect(() => moduleIdPipe.transform(negativeNumber)).toThrowError(
      new BadRequestException([`module_id must be a contract address or numeric value`]),
    );
  });

  it('should throw a BadRequestException for a floating-point number', () => {
    const floatingPointNumber = '3.14';

    expect(() => moduleIdPipe.transform(floatingPointNumber)).toThrowError(
      new BadRequestException([`module_id must be a contract address or numeric value`]),
    );
  });
});
