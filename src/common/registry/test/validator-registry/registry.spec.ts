/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test } from '@nestjs/testing';
import { nullTransport, LoggerModule } from '@lido-nestjs/logger';
import { getNetwork } from '@ethersproject/networks';
import { JsonRpcBatchProvider } from '@ethersproject/providers';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { key } from '../fixtures/key.fixture';
import {
  RegistryKeyStorageService,
  RegistryStorageService,
  ValidatorRegistryModule,
  ValidatorRegistryService,
} from '../..';
import { MikroORM } from '@mikro-orm/core';

describe('Validator', () => {
  const provider = new JsonRpcBatchProvider(process.env.EL_RPC_URL);
  let validatorService: ValidatorRegistryService;
  let keyStorage: RegistryKeyStorageService;
  let storageService: RegistryStorageService;

  const mockCall = jest.spyOn(provider, 'call').mockImplementation(async () => '');

  jest.spyOn(provider, 'detectNetwork').mockImplementation(async () => getNetwork('mainnet'));

  beforeEach(async () => {
    const imports = [
      MikroOrmModule.forRoot({
        dbName: ':memory:',
        type: 'sqlite',
        allowGlobalContext: true,
        entities: ['../**/*.entity.ts'],
      }),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
      ValidatorRegistryModule.forFeature({ provider }),
    ];
    const moduleRef = await Test.createTestingModule({ imports }).compile();
    validatorService = moduleRef.get(ValidatorRegistryService);
    keyStorage = moduleRef.get(RegistryKeyStorageService);
    storageService = moduleRef.get(RegistryStorageService);

    const generator = moduleRef.get(MikroORM).getSchemaGenerator();
    await generator.updateSchema();
  });

  afterEach(async () => {
    mockCall.mockReset();
    await storageService.onModuleDestroy();
  });

  test('getToIndex', async () => {
    const expected = 10;

    expect(validatorService.getToIndex({ usedSigningKeys: expected } as any)).toBe(expected);
  });

  test('getValidatorsKeysFromStorage', async () => {
    const expected = [{ index: 0, operatorIndex: 0, ...key }];
    jest.spyOn(keyStorage, 'findUsed').mockImplementation(async () => expected);

    await expect(validatorService.getValidatorsKeysFromStorage()).resolves.toBe(expected);
  });
});
