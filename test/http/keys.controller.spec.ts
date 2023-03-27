/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test } from '@nestjs/testing';
import { KeysController, KeysService } from 'http/keys';
import { hexZeroPad } from '@ethersproject/bytes';
import { KeysUpdateService } from 'jobs/keys-update/keys-update.service';
import { CuratedModuleService } from 'staking-router-modules/';

import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { ConfigService } from 'common/config';

import {
  curatedKeys,
  curatedKeysWithAddressMainnet,
  curatedKeysWithAddressGoerli,
  elMeta,
  elBlockSnapshot,
  stakingModulesMainnet,
  stakingModulesGoerli,
  curatedModuleMainnet,
} from '../fixtures';
import { StakingModule } from 'common/contracts';

describe('Keys controller', () => {
  let keysController: KeysController;
  let keysUpdateService: KeysUpdateService;
  let curatedModuleService: CuratedModuleService;
  const OLD_ENV = process.env;

  class ConfigServiceMock {
    get(value) {
      return process.env[value];
    }
  }

  class CuratedModuleServiceMock {
    getKeysWithMeta(filters) {
      return Promise.resolve({ keys: curatedKeys, meta: elMeta });
    }
    getKeyWithMetaByPubkey(pubkey: string) {
      return Promise.resolve({ keys: curatedKeys, meta: elMeta });
    }

    getKeysWithMetaByPubkeys(pubkeys: string[]) {
      return Promise.resolve({ keys: curatedKeys, meta: elMeta });
    }
  }

  class KeysUpdateServiceMock {
    getStakingModules() {
      return stakingModulesMainnet;
    }
  }

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...OLD_ENV };

    const moduleRef = await Test.createTestingModule({
      controllers: [KeysController],
      providers: [
        KeysService,
        {
          provide: CuratedModuleService,
          useClass: CuratedModuleServiceMock,
        },
        {
          provide: KeysUpdateService,
          useClass: KeysUpdateServiceMock,
        },
        {
          provide: ConfigService,
          useClass: ConfigServiceMock,
        },
        {
          provide: LOGGER_PROVIDER,
          useFactory: () => ({
            log: jest.fn(),
            warn: jest.fn(),
          }),
        },
      ],
    }).compile();
    keysController = moduleRef.get<KeysController>(KeysController);
    keysUpdateService = moduleRef.get<KeysUpdateService>(KeysUpdateService);
    curatedModuleService = moduleRef.get<CuratedModuleService>(CuratedModuleService);
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  describe('get', () => {
    test('keys on Mainnet', async () => {
      process.env['CHAIN_ID'] = '1';

      const getKeysWithMetaMock = jest.spyOn(curatedModuleService, 'getKeysWithMeta');
      const getStakingModulesMock = jest.spyOn(keysUpdateService, 'getStakingModules');

      const result = await keysController.get({ used: true, operatorIndex: 1 });

      expect(getStakingModulesMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledWith({ used: true, operatorIndex: 1 });

      expect(result).toEqual({
        data: curatedKeysWithAddressMainnet,
        meta: {
          elBlockSnapshot,
        },
      });
    });

    test('keys on Goerli', async () => {
      process.env['CHAIN_ID'] = '5';

      const getKeysWithMetaMock = jest.spyOn(curatedModuleService, 'getKeysWithMeta');
      const getStakingModulesMock = jest
        .spyOn(keysUpdateService, 'getStakingModules')
        .mockImplementation(() => stakingModulesGoerli);

      const result = await keysController.get({ used: true, operatorIndex: 1 });

      expect(getStakingModulesMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledWith({ used: true, operatorIndex: 1 });

      expect(result).toEqual({
        data: curatedKeysWithAddressGoerli,
        meta: {
          elBlockSnapshot,
        },
      });
    });

    test('EL meta is null', async () => {
      process.env['CHAIN_ID'] = '1';

      const getKeysWithMetaMock = jest
        .spyOn(curatedModuleService, 'getKeysWithMeta')
        .mockImplementation(() => Promise.resolve({ keys: [], meta: null }));
      const getStakingModulesMock = jest.spyOn(keysUpdateService, 'getStakingModules');

      const result = await keysController.get({ used: true, operatorIndex: 1 });

      expect(getStakingModulesMock).toBeCalledTimes(1);
      expect(result).toEqual({ data: [], meta: null });
      expect(getKeysWithMetaMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledWith({ used: true, operatorIndex: 1 });
    });

    test('request without query', async () => {
      process.env['CHAIN_ID'] = '1';

      const getKeysWithMetaMock = jest.spyOn(curatedModuleService, 'getKeysWithMeta');
      const getStakingModulesMock = jest.spyOn(keysUpdateService, 'getStakingModules');

      const result = await keysController.get({});

      expect(getStakingModulesMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledWith({});
      expect(result).toEqual({
        data: curatedKeysWithAddressMainnet,
        meta: {
          elBlockSnapshot,
        },
      });
    });

    test('Staking Modules list is empty', async () => {
      const getStakingModulesMock = jest.spyOn(keysUpdateService, 'getStakingModules').mockImplementation(() => []);
      const getKeysWithMetaMock = jest.spyOn(curatedModuleService, 'getKeysWithMeta');
      const result = await keysController.get({});

      expect(result).toEqual({ data: [], meta: null });
      expect(getStakingModulesMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledTimes(0);
    });

    test('Staking Modules list contains only unknown modules', async () => {
      const unknownType: any = 'unknown-address';
      const unknownModule: StakingModule = { ...curatedModuleMainnet, type: unknownType };
      const getStakingModulesMock = jest
        .spyOn(keysUpdateService, 'getStakingModules')
        .mockImplementation(() => [unknownModule]);
      const getKeysWithMetaMock = jest.spyOn(curatedModuleService, 'getKeysWithMeta');

      const result = await keysController.get({});

      expect(result).toEqual({ data: [], meta: null });
      expect(getStakingModulesMock).toBeCalledTimes(1);
      expect(getKeysWithMetaMock).toBeCalledTimes(0);
    });
  });

  describe('getByPubkey', () => {
    test('keys on Mainnet', async () => {
      process.env['CHAIN_ID'] = '1';

      const getKeyWithMetaByPubkeyMock = jest.spyOn(curatedModuleService, 'getKeyWithMetaByPubkey');
      const getStakingModulesMock = jest.spyOn(keysUpdateService, 'getStakingModules');

      const result = await keysController.getByPubkey(hexZeroPad('0x13', 98));

      expect(getStakingModulesMock).toBeCalledTimes(1);
      expect(getKeyWithMetaByPubkeyMock).toBeCalledTimes(1);
      expect(getKeyWithMetaByPubkeyMock).toBeCalledWith(hexZeroPad('0x13', 98));

      expect(result).toEqual({
        data: curatedKeysWithAddressMainnet,
        meta: {
          elBlockSnapshot,
        },
      });
    });

    test('keys on Goerli', async () => {
      process.env['CHAIN_ID'] = '5';

      const getKeyWithMetaByPubkeyMock = jest.spyOn(curatedModuleService, 'getKeyWithMetaByPubkey');
      const getStakingModulesMock = jest
        .spyOn(keysUpdateService, 'getStakingModules')
        .mockImplementation(() => stakingModulesGoerli);

      const result = await keysController.getByPubkey(hexZeroPad('0x13', 98));

      expect(getStakingModulesMock).toBeCalledTimes(1);
      expect(getKeyWithMetaByPubkeyMock).toBeCalledTimes(1);
      expect(getKeyWithMetaByPubkeyMock).toBeCalledWith(hexZeroPad('0x13', 98));

      expect(result).toEqual({
        data: curatedKeysWithAddressGoerli,
        meta: {
          elBlockSnapshot,
        },
      });
    });

    test('EL meta is null', async () => {
      process.env['CHAIN_ID'] = '1';

      const getKeyWithMetaByPubkeyMock = jest
        .spyOn(curatedModuleService, 'getKeyWithMetaByPubkey')
        .mockImplementation(() => Promise.resolve({ keys: [], meta: null }));
      const getStakingModulesMock = jest.spyOn(keysUpdateService, 'getStakingModules');

      const result = await keysController.getByPubkey(hexZeroPad('0x13', 98));

      expect(result).toEqual({ data: [], meta: null });
      expect(getStakingModulesMock).toBeCalledTimes(1);
      expect(getKeyWithMetaByPubkeyMock).toBeCalledTimes(1);
      expect(getKeyWithMetaByPubkeyMock).toBeCalledWith(hexZeroPad('0x13', 98));
    });

    test('404 error', async () => {
      process.env['CHAIN_ID'] = '1';

      const getKeyWithMetaByPubkeyMock = jest
        .spyOn(curatedModuleService, 'getKeyWithMetaByPubkey')
        .mockImplementation(() => Promise.resolve({ keys: [], meta: elMeta }));
      const getStakingModulesMock = jest.spyOn(keysUpdateService, 'getStakingModules');

      await expect(keysController.getByPubkey('')).rejects.toThrowError(`There are no keys with  public key in db.`);

      expect(getStakingModulesMock).toBeCalledTimes(1);
      expect(getKeyWithMetaByPubkeyMock).toBeCalledTimes(1);
      expect(getKeyWithMetaByPubkeyMock).toBeCalledWith('');
    });

    test('Staking Modules list is empty', async () => {
      const getStakingModulesMock = jest.spyOn(keysUpdateService, 'getStakingModules').mockImplementation(() => []);
      const getKeyWithMetaByPubkeyMock = jest.spyOn(curatedModuleService, 'getKeyWithMetaByPubkey');
      const result = await keysController.getByPubkey(hexZeroPad('0x13', 98));

      expect(result).toEqual({ data: [], meta: null });
      expect(getStakingModulesMock).toBeCalledTimes(1);
      expect(getKeyWithMetaByPubkeyMock).toBeCalledTimes(0);
    });

    test('Staking Modules list contains only unknown modules', async () => {
      const unknownType: any = 'unknown-address';
      const unknownModule: StakingModule = { ...curatedModuleMainnet, type: unknownType };
      const getStakingModulesMock = jest
        .spyOn(keysUpdateService, 'getStakingModules')
        .mockImplementation(() => [unknownModule]);
      const getKeyWithMetaByPubkeyMock = jest.spyOn(curatedModuleService, 'getKeyWithMetaByPubkey');

      const result = await keysController.getByPubkey(hexZeroPad('0x13', 98));

      expect(result).toEqual({ data: [], meta: null });
      expect(getStakingModulesMock).toBeCalledTimes(1);
      expect(getKeyWithMetaByPubkeyMock).toBeCalledTimes(0);
    });
  });

  describe('getByPubkeys', () => {
    test('keys on Mainnet', async () => {
      process.env['CHAIN_ID'] = '1';

      const getKeysWithMetaByPubkeysMock = jest.spyOn(curatedModuleService, 'getKeysWithMetaByPubkeys');
      const getStakingModulesMock = jest.spyOn(keysUpdateService, 'getStakingModules');

      const result = await keysController.getByPubkeys({ pubkeys: [hexZeroPad('0x13', 98), hexZeroPad('0x12', 98)] });

      expect(getKeysWithMetaByPubkeysMock).toBeCalledTimes(1);
      expect(getKeysWithMetaByPubkeysMock).toBeCalledWith([hexZeroPad('0x13', 98), hexZeroPad('0x12', 98)]);
      expect(getStakingModulesMock).toBeCalledTimes(1);
      expect(result).toEqual({
        data: curatedKeysWithAddressMainnet,
        meta: {
          elBlockSnapshot,
        },
      });
    });

    test('keys on Goerli', async () => {
      process.env['CHAIN_ID'] = '5';

      const getKeysWithMetaByPubkeysMock = jest.spyOn(curatedModuleService, 'getKeysWithMetaByPubkeys');
      const getStakingModulesMock = jest
        .spyOn(keysUpdateService, 'getStakingModules')
        .mockImplementation(() => stakingModulesGoerli);
      const result = await keysController.getByPubkeys({ pubkeys: [hexZeroPad('0x13', 98), hexZeroPad('0x12', 98)] });

      expect(getKeysWithMetaByPubkeysMock).toBeCalledTimes(1);
      expect(getKeysWithMetaByPubkeysMock).toBeCalledWith([hexZeroPad('0x13', 98), hexZeroPad('0x12', 98)]);
      expect(getStakingModulesMock).toBeCalledTimes(1);
      expect(result).toEqual({
        data: curatedKeysWithAddressGoerli,
        meta: {
          elBlockSnapshot,
        },
      });
    });

    test('EL meta is null', async () => {
      process.env['CHAIN_ID'] = '1';

      const getKeysWithMetaByPubkeysMock = jest
        .spyOn(curatedModuleService, 'getKeysWithMetaByPubkeys')
        .mockImplementation(() => Promise.resolve({ keys: [], meta: null }));
      const getStakingModulesMock = jest.spyOn(keysUpdateService, 'getStakingModules');

      const result = await keysController.getByPubkeys({ pubkeys: [hexZeroPad('0x13', 98), hexZeroPad('0x12', 98)] });

      expect(result).toEqual({ data: [], meta: null });
      expect(getStakingModulesMock).toBeCalledTimes(1);
      expect(getKeysWithMetaByPubkeysMock).toBeCalledTimes(1);
      expect(getKeysWithMetaByPubkeysMock).toBeCalledWith([hexZeroPad('0x13', 98), hexZeroPad('0x12', 98)]);
    });

    test('Staking Modules list is empty', async () => {
      const getStakingModulesMock = jest.spyOn(keysUpdateService, 'getStakingModules').mockImplementation(() => []);
      const getKeysWithMetaByPubkeysMock = jest.spyOn(curatedModuleService, 'getKeysWithMetaByPubkeys');
      const result = await keysController.getByPubkeys({ pubkeys: [hexZeroPad('0x13', 98), hexZeroPad('0x12', 98)] });

      expect(result).toEqual({ data: [], meta: null });
      expect(getStakingModulesMock).toBeCalledTimes(1);
      expect(getKeysWithMetaByPubkeysMock).toBeCalledTimes(0);
    });

    test('Staking Modules list contains only unknown modules', async () => {
      const unknownType: any = 'unknown-address';
      const unknownModule: StakingModule = { ...curatedModuleMainnet, type: unknownType };
      const getStakingModulesMock = jest
        .spyOn(keysUpdateService, 'getStakingModules')
        .mockImplementation(() => [unknownModule]);
      const getKeyWithMetaByPubkeyMock = jest.spyOn(curatedModuleService, 'getKeyWithMetaByPubkey');

      const result = await keysController.getByPubkeys({ pubkeys: [hexZeroPad('0x13', 98), hexZeroPad('0x12', 98)] });

      expect(result).toEqual({ data: [], meta: null });
      expect(getStakingModulesMock).toBeCalledTimes(1);
      expect(getKeyWithMetaByPubkeyMock).toBeCalledTimes(0);
    });
  });
});
