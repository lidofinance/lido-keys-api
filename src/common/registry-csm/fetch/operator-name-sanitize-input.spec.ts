import { RegistryOperatorFetchService } from './operator.fetch';
import { InvalidOperatorNameError } from './operator-name-resolver';

const NUL = String.fromCharCode(0);
const MODULE = '0x' + 'a'.repeat(40);
const TYPE = 'curated-onchain-v2';

const buildService = (resolve: jest.Mock) => {
  const logger = { error: jest.fn(), warn: jest.fn(), log: jest.fn() } as any;
  const connectCsm = jest.fn() as any; // not used by resolveOperatorName
  const resolvers = { [TYPE]: { resolve } } as any;
  const moduleTypeRegistry = { get: jest.fn().mockReturnValue(TYPE) } as any;
  return new RegistryOperatorFetchService(logger, connectCsm, resolvers, moduleTypeRegistry);
};

// resolveOperatorName is private; call it directly for a unit-level assertion.
const resolveName = (service: any, index: number): Promise<string> => service.resolveOperatorName(MODULE, index, {});

describe('RegistryOperatorFetchService.resolveOperatorName - invalid operator name', () => {
  it('returns a placeholder when the name can not be decoded (invalid UTF-8)', async () => {
    // ethers throws on field access for malformed UTF-8, the resolver wraps it into InvalidOperatorNameError
    const resolve = jest
      .fn()
      .mockRejectedValue(new InvalidOperatorNameError('bad name', new Error('invalid codepoint at offset 0')));
    await expect(resolveName(buildService(resolve), 7)).resolves.toBe('invalidName7');
  });

  it('propagates transport errors instead of returning a placeholder', async () => {
    const networkError = Object.assign(new Error('timeout'), { code: 'TIMEOUT' });
    const resolve = jest.fn().mockRejectedValue(networkError);
    await expect(resolveName(buildService(resolve), 10)).rejects.toBe(networkError);
  });

  it('returns a placeholder when the resolved name contains a NUL byte', async () => {
    const resolve = jest.fn().mockResolvedValue(`A${NUL}B`);
    await expect(resolveName(buildService(resolve), 8)).resolves.toBe('invalidName8');
  });

  it('passes a clean name through unchanged', async () => {
    const resolve = jest.fn().mockResolvedValue('Community Operator 3');
    await expect(resolveName(buildService(resolve), 9)).resolves.toBe('Community Operator 3');
  });
});
