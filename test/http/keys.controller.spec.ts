import { Test } from '@nestjs/testing';
import { KeysController, KeysService } from '../../src/http/keys';
import { hexZeroPad } from '@ethersproject/bytes';
import { RegistryService } from '../../src/jobs/registry.service';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { ConfigService } from '../../src/common/config';
import { MODULE_FIELDS } from 'http/keys/entities';

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
    {
      index: 4,
      operatorIndex: 1,
      key: hexZeroPad('0x15', 98),
      depositSignature: hexZeroPad('0x15', 194),
      used: false,
    },
  ];

  const meta = {
    blockNumber: 15819109,
    blockHash: '0x5ba6b9e7cfbbcdd0171f8c2ca5ff08852156e26cf26c722362c63d8c66ac2c15',
  };

  class ConfigServiceMock {
    get(value) {
      return process.env[value];
    }
  }

  class RegistryServiceMock {
    getKeysWithMeta(filters: { used?: boolean }) {
      const { used } = filters;

      if (used == undefined) {
        return Promise.resolve({ keys: registryKeys, meta });
      }
      const keys = registryKeys.filter((key) => key.used == used);

      return Promise.resolve({ keys, meta });
    }

    getKeysWithMetaByPubKeys(pubkeys: string[]) {
      const keys = registryKeys.filter((el) => pubkeys.includes(el.key));
      return Promise.resolve({ keys, meta });
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
          provide: ConfigService,
          useClass: ConfigServiceMock,
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

  describe('getAll', () => {
    test('without query', async () => {
      const result = await keysController.get(<any>{});
      const keys = registryKeys.map((key) => ({ key: key.key }));
      expect(result).toEqual({ data: keys, meta });
    });

    test('with fields as one value', async () => {
      const result = await keysController.get(<any>{ fields: 'depositSignature' });
      const keys = registryKeys.map((key) => ({ key: key.key, depositSignature: key.depositSignature }));
      expect(result).toEqual({ data: keys, meta });
    });

    test('with list of fields', async () => {
      const result = await keysController.get(<any>{ fields: ['depositSignature', 'operatorIndex'] });
      const keys = registryKeys.map((key) => ({ key: key.key, depositSignature: key.depositSignature }));
      expect(result).toEqual({ data: keys, meta });
    });
  });

  describe('getByPubkeys', () => {
    test('without query', async () => {
      const result = await keysController.getByPubkeys([registryKeys[0].key, registryKeys[1].key], <any>{});
      expect(result).toEqual({ data: [{ key: registryKeys[0].key }, { key: registryKeys[1].key }], meta });
    });

    test('with fields as one value', async () => {
      const result = await keysController.getByPubkeys([registryKeys[0].key, registryKeys[1].key], <any>{
        fields: 'depositSignature',
      });
      expect(result).toEqual({
        data: [
          { key: registryKeys[0].key, depositSignature: registryKeys[0].depositSignature },
          { key: registryKeys[1].key, depositSignature: registryKeys[1].depositSignature },
        ],
        meta,
      });
    });

    test('with list of fields', async () => {
      const result = await keysController.getByPubkeys([registryKeys[0].key, registryKeys[1].key], <any>{
        fields: ['depositSignature', 'operatorIndex'],
      });
      expect(result).toEqual({
        data: [
          { key: registryKeys[0].key, depositSignature: registryKeys[0].depositSignature },
          { key: registryKeys[1].key, depositSignature: registryKeys[1].depositSignature },
        ],
        meta,
      });
    });
  });

  describe('getForModule', () => {
    test('unknown module', async () => {
      process.env['CHAIN_ID'] = '1';
      const address = '0x000000000000000000';
      expect(keysController.getForModule(address, <any>{})).rejects.toThrowError(
        `Module with address ${address} is not supported`,
      );
    });

    test('keys for NodeOperatorRegistry on Mainnet', async () => {
      process.env['CHAIN_ID'] = '1';
      const result = await keysController.getForModule('0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5', <any>{});
      const keys = registryKeys.map((key) => ({ key: key.key }));

      const moduleMeta = { ...meta, moduleAddress: '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5' };

      expect(result).toEqual({
        data: keys,
        meta: moduleMeta,
      });
    });

    test('keys for NodeOperatorRegistry on Goerli', async () => {
      // set process.env
      process.env['CHAIN_ID'] = '5';

      const result = await keysController.getForModule('0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320', <any>{});
      const keys = registryKeys.map((key) => ({ key: key.key }));

      const moduleMeta = { ...meta, moduleAddress: '0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320' };

      expect(result).toEqual({
        data: keys,
        meta: moduleMeta,
      });
    });

    test('Add fileds', async () => {
      process.env['CHAIN_ID'] = '1';
      const result = await keysController.getForModule('0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5', {
        fields: Object.values(MODULE_FIELDS),
      });

      const moduleMeta = { ...meta, moduleAddress: '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5' };

      expect(result).toEqual({
        data: registryKeys,
        meta: moduleMeta,
      });
    });

    test('used keys', async () => {
      process.env['CHAIN_ID'] = '1';
      const result = await keysController.getForModule('0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5', {
        fields: Object.values(MODULE_FIELDS),
        used: true,
      });

      const keys = registryKeys.filter((key) => key.used);

      const moduleMeta = { ...meta, moduleAddress: '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5' };

      expect(result).toEqual({
        data: keys,
        meta: moduleMeta,
      });
    });

    test('unused keys', async () => {
      process.env['CHAIN_ID'] = '1';
      const result = await keysController.getForModule('0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5', {
        fields: Object.values(MODULE_FIELDS),
        used: false,
      });

      const keys = registryKeys.filter((key) => !key.used);

      const moduleMeta = { ...meta, moduleAddress: '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5' };

      expect(result).toEqual({
        data: keys,
        meta: moduleMeta,
      });
    });
  });
});
