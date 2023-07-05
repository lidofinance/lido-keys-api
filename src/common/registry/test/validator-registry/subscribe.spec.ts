import { Test } from '@nestjs/testing';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { nullTransport, LoggerModule } from '@lido-nestjs/logger';
import { getNetwork } from '@ethersproject/networks';
import { JsonRpcBatchProvider } from '@ethersproject/providers';
import {
  ValidatorRegistryModule,
  ValidatorRegistryService,
  RegistryStorageService,
  RegistryKeyStorageService,
  RegistryMetaStorageService,
  RegistryOperatorStorageService,
  RegistryMeta,
} from '../../';
import { keys, meta, operators } from '../fixtures/db.fixture';
import { MikroORM } from '@mikro-orm/core';

const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

describe('Subscribe with custom timer', () => {
  const provider = new JsonRpcBatchProvider(process.env.EL_RPC_URL);

  let registryService: ValidatorRegistryService;
  let registryStorageService: RegistryStorageService;

  let keyStorageService: RegistryKeyStorageService;
  let metaStorageService: RegistryMetaStorageService;
  let operatorStorageService: RegistryOperatorStorageService;

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
      ValidatorRegistryModule.forFeature({
        provider,
        subscribeInterval: '*/2 * * * * *',
      }),
    ];

    const moduleRef = await Test.createTestingModule({ imports }).compile();
    registryService = moduleRef.get(ValidatorRegistryService);
    registryStorageService = moduleRef.get(RegistryStorageService);

    keyStorageService = moduleRef.get(RegistryKeyStorageService);
    metaStorageService = moduleRef.get(RegistryMetaStorageService);
    operatorStorageService = moduleRef.get(RegistryOperatorStorageService);

    const generator = moduleRef.get(MikroORM).getSchemaGenerator();
    await generator.updateSchema();

    await keyStorageService.save(keys);
    await metaStorageService.save(meta);
    await operatorStorageService.save(operators);
  });

  afterEach(async () => {
    mockCall.mockReset();
    await registryService.clear();
    await registryStorageService.onModuleDestroy();
  });

  describe('subscribe', () => {
    test('empty data', async () => {
      jest.spyOn(registryService, 'update').mockImplementation(async () => {
        return undefined;
      });

      const unSub = registryService.subscribe(() => {
        unSub();
      });
      await wait(3000);
      expect.assertions(0);
      unSub();
    });

    test('some data', async () => {
      jest.spyOn(registryService, 'update').mockImplementation(async () => {
        return {} as RegistryMeta;
      });

      const unSub = registryService.subscribe((error, payload) => {
        expect(error).toBe(null);
        expect(payload).toEqual({});
        unSub();
      });
      await wait(3000);
      expect.assertions(2);
    });

    test('error', async () => {
      jest.spyOn(registryService, 'update').mockImplementation(async () => {
        throw new Error('some error');
      });

      const unSub = registryService.subscribe((error, payload) => {
        expect(error).toBeDefined();
        expect(payload).toBeUndefined();
        unSub();
      });
      await wait(3000);
      expect.assertions(2);
    });
  });
});

describe('Subscribe without custom timer', () => {
  const provider = new JsonRpcBatchProvider(process.env.EL_RPC_URL);

  let registryService: ValidatorRegistryService;
  let registryStorageService: RegistryStorageService;

  let keyStorageService: RegistryKeyStorageService;
  let metaStorageService: RegistryMetaStorageService;
  let operatorStorageService: RegistryOperatorStorageService;

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
      ValidatorRegistryModule.forFeature({
        provider,
      }),
    ];

    const moduleRef = await Test.createTestingModule({ imports }).compile();
    registryService = moduleRef.get(ValidatorRegistryService);
    registryStorageService = moduleRef.get(RegistryStorageService);

    keyStorageService = moduleRef.get(RegistryKeyStorageService);
    metaStorageService = moduleRef.get(RegistryMetaStorageService);
    operatorStorageService = moduleRef.get(RegistryOperatorStorageService);

    const generator = moduleRef.get(MikroORM).getSchemaGenerator();
    await generator.updateSchema();

    await keyStorageService.save(keys);
    await metaStorageService.save(meta);
    await operatorStorageService.save(operators);
  });

  afterEach(async () => {
    mockCall.mockReset();
    await registryService.clear();
    await registryStorageService.onModuleDestroy();
  });

  describe('subscribe', () => {
    test('empty data', async () => {
      jest.spyOn(registryService, 'update').mockImplementation(async () => {
        return undefined;
      });

      const unSub = registryService.subscribe(() => {
        unSub();
      });
      await wait(10_000);
      expect.assertions(0);
      unSub();
    }, 11_000);
  });
});
