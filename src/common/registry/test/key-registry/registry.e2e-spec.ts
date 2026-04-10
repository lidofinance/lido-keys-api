import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { nullTransport, LoggerModule } from '@lido-nestjs/logger';
import { key } from '../fixtures/key.fixture';
import { RegistryKeyStorageService, KeyRegistryModule, KeyRegistryService, RegistryStorageService } from '../..';
import { MikroORM } from '@mikro-orm/core';
import { REGISTRY_CONTRACT_TOKEN } from 'common/contracts';
import { DatabaseE2ETestingModule } from 'app';
import { PrometheusModule } from 'common/prometheus';

const address = '0x' + 'aa'.repeat(20);

const mockConnectRegistry = jest.fn();

@Global()
@Module({
  providers: [{ provide: REGISTRY_CONTRACT_TOKEN, useValue: mockConnectRegistry }],
  exports: [REGISTRY_CONTRACT_TOKEN],
})
class MockContractsModule {}

describe('Key', () => {
  let registryService: KeyRegistryService;
  let keyStorage: RegistryKeyStorageService;
  let storageService: RegistryStorageService;

  beforeEach(async () => {
    const imports = [
      MockContractsModule,
      DatabaseE2ETestingModule.forRoot(),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
      KeyRegistryModule.forFeature(),
      PrometheusModule,
    ];
    const moduleRef = await Test.createTestingModule({ imports }).compile();
    registryService = moduleRef.get(KeyRegistryService);
    keyStorage = moduleRef.get(RegistryKeyStorageService);
    storageService = moduleRef.get(RegistryStorageService);

    const generator = moduleRef.get(MikroORM).getSchemaGenerator();
    await generator.refreshDatabase();
    await generator.clearDatabase();
  });

  afterEach(async () => {
    await storageService.onModuleDestroy();
  });

  test('getToIndex', async () => {
    const expected = 10;

    expect(registryService.getToIndex({ totalSigningKeys: expected } as any)).toBe(expected);
  });

  test('getModuleKeysFromStorage', async () => {
    const expected = [{ index: 0, operatorIndex: 0, moduleAddress: address, ...key, used: false, vetted: true }];
    jest.spyOn(keyStorage, 'findAll').mockImplementation(async () => expected);

    await expect(registryService.getModuleKeysFromStorage(address)).resolves.toBe(expected);
  });

  test('getUsedKeysFromStorage', async () => {
    const expected = [{ index: 0, operatorIndex: 0, moduleAddress: address, ...key, used: true, vetted: true }];
    jest.spyOn(keyStorage, 'findUsed').mockImplementation(async () => expected);

    await expect(registryService.getUsedKeysFromStorage(address)).resolves.toBe(expected);
  });
});
