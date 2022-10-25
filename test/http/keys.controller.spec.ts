import { Test } from '@nestjs/testing';
import { KeysController, KeysService } from '../../src/http/keys';
import { hexZeroPad } from '@ethersproject/bytes';
import { RegistryService } from '../../src/jobs/registry.service';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
describe('Keys controller', () => {
  let keysController: KeysController;

  const registryKeys = [
    {
      index: 1,
      operatorIndex: 1,
      key: hexZeroPad('0x12', 98),
      depositSignature: hexZeroPad('0x12', 194),
      used: true,
    },
    {
      index: 2,
      operatorIndex: 1,
      key: hexZeroPad('0x13', 98),
      depositSignature: hexZeroPad('0x13', 194),
      used: true,
    },
    {
      index: 3,
      operatorIndex: 1,
      key: hexZeroPad('0x14', 98),
      depositSignature: hexZeroPad('0x14', 194),
      used: true,
    },
  ];

  const meta = {
    blockNumber: 15819109,
    blockHash: '0x5ba6b9e7cfbbcdd0171f8c2ca5ff08852156e26cf26c722362c63d8c66ac2c15',
  };

  class RegistryServiceMock {
    getAllKeysFromStorage() {
      return Promise.resolve(registryKeys);
    }
    getMetaDataFromStorage() {
      return Promise.resolve(meta);
    }
    getOperatorKey(pubkey: string) {
      const key = registryKeys.find((el) => el.key === pubkey);
      return Promise.resolve(key);
    }
  }

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [KeysController],
      providers: [
        KeysService,
        {
          provide: RegistryService,
          useClass: RegistryServiceMock,
        },
        {
          provide: LOGGER_PROVIDER,
          useFactory: () => ({
            log: jest.fn(),
          }),
        },
      ],
    }).compile();
    keysController = moduleRef.get<KeysController>(KeysController);
  });

  describe('getALL', () => {
    test('without query', async () => {
      const result = await keysController.getAll(<any>{});
      const keys = registryKeys.map((key) => ({ pubkey: key.key }));
      expect(result).toEqual({ data: keys, meta: meta });
    });

    test('with fields as one value', async () => {
      const result = await keysController.getAll(<any>{ fields: 'signature' });
      const keys = registryKeys.map((key) => ({ pubkey: key.key, signature: key.depositSignature }));
      expect(result).toEqual({ data: keys, meta: meta });
    });

    test('with list of fields', async () => {
      const result = await keysController.getAll(<any>{ fields: ['signature', 'operatorIndex'] });
      const keys = registryKeys.map((key) => ({ pubkey: key.key, signature: key.depositSignature }));
      expect(result).toEqual({ data: keys, meta: meta });
    });
  });

  describe('getOne', () => {
    test('without query', async () => {
      const result = await keysController.getOne(<any>{}, registryKeys[0].key);
      expect(result).toEqual({ data: { pubkey: registryKeys[0].key }, meta: meta });
    });

    test('with fields as one value', async () => {
      const result = await keysController.getOne(<any>{ fields: 'signature' }, registryKeys[0].key);
      expect(result).toEqual({
        data: { pubkey: registryKeys[0].key, signature: registryKeys[0].depositSignature },
        meta: meta,
      });
    });

    test('with list of fields', async () => {
      const result = await keysController.getOne(<any>{ fields: ['signature', 'operatorIndex'] }, registryKeys[0].key);
      expect(result).toEqual({
        data: { pubkey: registryKeys[0].key, signature: registryKeys[0].depositSignature },
        meta: meta,
      });
    });
  });
});
