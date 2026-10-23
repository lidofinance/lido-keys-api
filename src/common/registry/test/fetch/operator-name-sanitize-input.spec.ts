import { RegistryOperatorFetchService } from '../../fetch/operator.fetch';

// Minimal BigNumber-like stub (the fetch path only calls .toNumber()).
const bn = (n: number) => ({ toNumber: () => n } as any);

const MODULE = '0x' + 'a'.repeat(40);

// Builds a getNodeOperator() result whose `name` is defined by the given descriptor,
// so we can make reading it throw (invalid UTF-8) or return invalid bytes.
const buildOperator = (nameDescriptor: PropertyDescriptor) => {
  const op: any = {
    active: true,
    rewardAddress: '0x' + '0'.repeat(40),
    totalVettedValidators: bn(3),
    totalExitedValidators: bn(0),
    totalAddedValidators: bn(3),
    totalDepositedValidators: bn(2),
  };
  Object.defineProperty(op, 'name', { enumerable: true, configurable: true, ...nameDescriptor });
  return op;
};

const buildService = (operator: any) => {
  const logger = { error: jest.fn(), warn: jest.fn(), log: jest.fn() } as any;
  const contract = {
    getNodeOperator: jest.fn().mockResolvedValue(operator),
    getNodeOperatorSummary: jest.fn().mockResolvedValue({ depositableValidatorsCount: bn(1) }),
  };
  const connectRegistry = jest.fn().mockReturnValue(contract) as any;
  return new RegistryOperatorFetchService(logger, connectRegistry);
};

describe('RegistryOperatorFetchService.fetchOne - invalid operator name', () => {
  it('returns a placeholder when reading the name throws (invalid UTF-8)', async () => {
    const op = buildOperator({
      get() {
        // mirrors ethers' throwing getter for malformed UTF-8
        throw new Error('invalid codepoint at offset 0; unexpected continuation byte');
      },
    });
    const result = await buildService(op).fetchOne(MODULE, 7);
    expect(result.name).toBe('invalidName7');
  });

  it('returns a placeholder when the name contains a NUL byte', async () => {
    const op = buildOperator({ value: `A${String.fromCharCode(0)}B` });
    const result = await buildService(op).fetchOne(MODULE, 8);
    expect(result.name).toBe('invalidName8');
  });

  it('passes a clean name through unchanged', async () => {
    const op = buildOperator({ value: 'correct name' });
    const result = await buildService(op).fetchOne(MODULE, 9);
    expect(result.name).toBe('correct name');
  });
});
