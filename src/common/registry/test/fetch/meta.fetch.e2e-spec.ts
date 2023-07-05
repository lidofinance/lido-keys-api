import { Test } from '@nestjs/testing';
import { getDefaultProvider } from '@ethersproject/providers';
import { RegistryFetchModule, RegistryMetaFetchService } from '../../';

describe('Operators', () => {
  const provider = getDefaultProvider(process.env.EL_RPC_URL);
  let fetchService: RegistryMetaFetchService;

  beforeEach(async () => {
    const imports = [RegistryFetchModule.forFeature({ provider })];
    const moduleRef = await Test.createTestingModule({ imports }).compile();
    fetchService = moduleRef.get(RegistryMetaFetchService);
  });

  test('fetch keysOpIndex', async () => {
    const keysOpIndex = await fetchService.fetchKeysOpIndex();
    expect(typeof keysOpIndex).toBe('number');
    expect(keysOpIndex).toBeGreaterThan(0);
  });
});
