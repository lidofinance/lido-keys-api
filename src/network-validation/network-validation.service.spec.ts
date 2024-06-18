import { Test, TestingModule } from '@nestjs/testing';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { REGISTRY_CONTRACT_ADDRESSES, LIDO_LOCATOR_CONTRACT_TOKEN } from '@lido-nestjs/contracts';
import { ConfigModule, ConfigService } from 'common/config';
import { ConsensusProviderService } from '../common/consensus-provider';
import { ExecutionProviderService } from '../common/execution-provider';
import { RegistryKeyStorageService, RegistryOperatorStorageService } from '../common/registry';
import { SRModuleStorageService } from '../storage/sr-module.storage';
import { AppInfoStorageService } from '../storage/app-info.storage';
import { NetworkValidationService } from './network-validation.service';
import { key } from 'common/registry/test/fixtures/key.fixture';
import { curatedModule } from '../http/db.fixtures';
import { operator } from 'common/registry/test/fixtures/operator.fixture';
import { DatabaseE2ETestingModule } from '../app';
import {
  InconsistentDataInDBErrorTypes,
  ChainMismatchError,
  InconsistentDataInDBError,
} from './network-validation.service';

describe('network configuration correctness sanity checker', () => {
  let configService: ConfigService;
  let locatorContract: { address: string };
  let executionProviderService: ExecutionProviderService;
  let registryKeyStorageService: RegistryKeyStorageService;
  let moduleStorageService: SRModuleStorageService;
  let operatorStorageService: RegistryOperatorStorageService;
  let networkValidationService: NetworkValidationService;
  let appInfoStorageService: AppInfoStorageService;

  const keyFixture = {
    ...key,
    index: 1,
    operatorIndex: 0,
    moduleAddress: REGISTRY_CONTRACT_ADDRESSES[17000].toLowerCase(),
  };

  const holeskyCuratedModuleFixture = {
    ...curatedModule,
    id: 1,
    stakingModuleAddress: REGISTRY_CONTRACT_ADDRESSES[17000].toLowerCase(),
    nonce: 14100,
    lastChangedBlockHash: '0x662e3e713207240b25d01324b6eccdc91493249a5048881544254994694530a5',
  };

  const operatorFixture = {
    ...operator,
    index: 0,
    moduleAddress: REGISTRY_CONTRACT_ADDRESSES[17000].toLowerCase(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule, DatabaseE2ETestingModule.forRoot()],
      providers: [
        {
          provide: LIDO_LOCATOR_CONTRACT_TOKEN,
          useValue: {
            address: '0x17000',
          },
        },
        {
          provide: LOGGER_PROVIDER,
          useValue: {
            log: jest.fn(),
          },
        },
        {
          provide: ConsensusProviderService,
          useValue: {
            getDepositContract: jest.fn(async () => ({
              data: {
                chain_id: '1',
              },
            })),
          },
        },
        {
          provide: ExecutionProviderService,
          useValue: {
            getChainId: jest.fn(async () => 17000),
          },
        },
        {
          provide: RegistryKeyStorageService,
          useValue: {
            find: jest.fn(async () => []),
          },
        },
        {
          provide: SRModuleStorageService,
          useValue: {
            findOneByModuleId: jest.fn(async () => null),
          },
        },
        {
          provide: RegistryOperatorStorageService,
          useValue: {
            find: jest.fn(async () => []),
          },
        },
        {
          provide: AppInfoStorageService,
          useValue: {
            update: jest.fn(),
            get: jest.fn(async () => ({
              chainId: 17000,
              locatorAddress: '0x17000',
            })),
          },
        },
        NetworkValidationService,
      ],
    }).compile();

    configService = module.get<ConfigService>(ConfigService);
    locatorContract = module.get(LIDO_LOCATOR_CONTRACT_TOKEN);
    executionProviderService = module.get<ExecutionProviderService>(ExecutionProviderService);
    registryKeyStorageService = module.get<RegistryKeyStorageService>(RegistryKeyStorageService);
    moduleStorageService = module.get<SRModuleStorageService>(SRModuleStorageService);
    operatorStorageService = module.get<RegistryOperatorStorageService>(RegistryOperatorStorageService);
    appInfoStorageService = module.get<AppInfoStorageService>(AppInfoStorageService);
    networkValidationService = module.get<NetworkValidationService>(NetworkValidationService);

    jest.spyOn(configService, 'get').mockImplementation((path) => {
      if (path === 'VALIDATOR_REGISTRY_ENABLE') {
        return false;
      }

      if (path === 'CHAIN_ID') {
        return 17000;
      }

      return undefined;
    });
  });

  it('should be defined', () => {
    expect(networkValidationService).toBeDefined();
  });

  it("should throw error if the chain ID defined in env variables doesn't match the chain ID returned by EL node if the validator registry is enabled in config", async () => {
    jest.spyOn(configService, 'get').mockImplementation((path) => {
      if (path === 'VALIDATOR_REGISTRY_ENABLE') {
        return true;
      }

      if (path === 'CHAIN_ID') {
        return 1;
      }

      return undefined;
    });

    const updateAppInfoMock = jest.spyOn(appInfoStorageService, 'update');

    return networkValidationService.validate().catch((error: Error) => {
      expect(error).toBeInstanceOf(ChainMismatchError);
      expect(error).toHaveProperty('configChainId', 1);
      expect(error).toHaveProperty('elChainId', 17000);

      expect(updateAppInfoMock).not.toHaveBeenCalled();
    });
  });

  it("should throw error if the chain ID returned by EL node doesn't match the chain ID returned by CL node if the validator registry is enabled in config", async () => {
    jest.spyOn(configService, 'get').mockImplementation((path) => {
      if (path === 'VALIDATOR_REGISTRY_ENABLE') {
        return true;
      }

      if (path === 'CHAIN_ID') {
        return 17000;
      }

      return undefined;
    });

    const updateAppInfoMock = jest.spyOn(appInfoStorageService, 'update');

    return networkValidationService.validate().catch((error: Error) => {
      expect(error).toBeInstanceOf(ChainMismatchError);
      expect(error).toHaveProperty('configChainId', 17000);
      expect(error).toHaveProperty('elChainId', 17000);
      expect(error).toHaveProperty('clChainId', 1);

      expect(updateAppInfoMock).not.toHaveBeenCalled();
    });
  });

  it("should throw error if the chain ID defined in env variables doesn't match the chain ID returned by CL node if the validator registry is enabled in config", async () => {
    jest.spyOn(configService, 'get').mockImplementation((path) => {
      if (path === 'VALIDATOR_REGISTRY_ENABLE') {
        return true;
      }

      if (path === 'CHAIN_ID') {
        return 17000;
      }

      return undefined;
    });

    const updateAppInfoMock = jest.spyOn(appInfoStorageService, 'update');

    return networkValidationService.validate().catch((error: Error) => {
      expect(error).toBeInstanceOf(ChainMismatchError);
      expect(error).toHaveProperty('configChainId', 17000);
      expect(error).toHaveProperty('elChainId', 17000);
      expect(error).toHaveProperty('clChainId', 1);

      expect(updateAppInfoMock).not.toHaveBeenCalled();
    });
  });

  it('should save information about the chain and locator to the DB if there are no keys, modules, and operators in the DB', async () => {
    const updateAppInfoMock = jest.spyOn(appInfoStorageService, 'update');

    await expect(networkValidationService.validate()).resolves.not.toThrow();
    expect(updateAppInfoMock).toBeCalledTimes(1);
    expect(updateAppInfoMock).toBeCalledWith({
      chainId: 17000,
      locatorAddress: '0x17000',
    });
  });

  it("should throw error if info about chain ID stored in the DB doesn't match chain ID configured in env variables and keys, modules or operators tables have some info in the DB", async () => {
    jest.spyOn(configService, 'get').mockImplementation((path) => {
      if (path === 'VALIDATOR_REGISTRY_ENABLE') {
        return false;
      }

      if (path === 'CHAIN_ID') {
        return 1;
      }

      return undefined;
    });

    jest.spyOn(executionProviderService, 'getChainId').mockImplementationOnce(() => Promise.resolve(1));

    jest.spyOn(registryKeyStorageService, 'find').mockImplementationOnce(() => Promise.resolve([keyFixture]));

    jest
      .spyOn(moduleStorageService, 'findOneByModuleId')
      .mockImplementationOnce(() => Promise.resolve(holeskyCuratedModuleFixture));

    jest.spyOn(operatorStorageService, 'find').mockImplementationOnce(() => Promise.resolve([operatorFixture]));

    const updateAppInfoMock = jest.spyOn(appInfoStorageService, 'update');

    return networkValidationService.validate().catch((error: Error) => {
      expect(error).toBeInstanceOf(InconsistentDataInDBError);
      expect(error).toHaveProperty('type', InconsistentDataInDBErrorTypes.appInfoMismatch);

      expect(updateAppInfoMock).not.toHaveBeenCalled();
    });
  });

  it("should throw error if info about locator address stored in the DB doesn't match locator address returned by locator service and keys, modules or operators tables have some info in the DB", async () => {
    jest.spyOn(registryKeyStorageService, 'find').mockImplementationOnce(() => Promise.resolve([keyFixture]));

    jest
      .spyOn(moduleStorageService, 'findOneByModuleId')
      .mockImplementationOnce(() => Promise.resolve(holeskyCuratedModuleFixture));

    jest.spyOn(operatorStorageService, 'find').mockImplementationOnce(() => Promise.resolve([operatorFixture]));

    locatorContract.address = '0x1';

    const updateAppInfoMock = jest.spyOn(appInfoStorageService, 'update');

    return networkValidationService.validate().catch((error: Error) => {
      expect(error).toBeInstanceOf(InconsistentDataInDBError);
      expect(error).toHaveProperty('type', InconsistentDataInDBErrorTypes.appInfoMismatch);

      expect(updateAppInfoMock).not.toHaveBeenCalled();
    });
  });

  it('should execute successfully if info about chain ID matches the chain ID configured in env variables and locator address stored in the DB matches the locator address returned by locator service, and keys, modules, or operators tables have some info in the DB', async () => {
    jest.spyOn(registryKeyStorageService, 'find').mockImplementationOnce(() => Promise.resolve([keyFixture]));

    jest
      .spyOn(moduleStorageService, 'findOneByModuleId')
      .mockImplementationOnce(() => Promise.resolve(holeskyCuratedModuleFixture));

    jest.spyOn(operatorStorageService, 'find').mockImplementationOnce(() => Promise.resolve([operatorFixture]));

    const updateAppInfoMock = jest.spyOn(appInfoStorageService, 'update');

    await expect(networkValidationService.validate()).resolves.not.toThrow();
    expect(updateAppInfoMock).not.toHaveBeenCalled();
  });

  it("should throw error if modules table is not empty in the DB, but the keys table is empty, and DB doesn't have information about chain ID and locator", async () => {
    jest
      .spyOn(moduleStorageService, 'findOneByModuleId')
      .mockImplementationOnce(() => Promise.resolve(holeskyCuratedModuleFixture));

    jest.spyOn(appInfoStorageService, 'get').mockImplementationOnce(() => Promise.resolve(null));

    const updateAppInfoMock = jest.spyOn(appInfoStorageService, 'update');

    return networkValidationService.validate().catch((error: Error) => {
      expect(error).toBeInstanceOf(InconsistentDataInDBError);
      expect(error).toHaveProperty('type');

      const dbDataError = error as InconsistentDataInDBError;
      expect([InconsistentDataInDBErrorTypes.emptyKeys, InconsistentDataInDBErrorTypes.emptyOperators]).toContain(
        dbDataError.type,
      );
      expect(dbDataError.type).not.toEqual(InconsistentDataInDBErrorTypes.emptyModules);

      expect(updateAppInfoMock).not.toHaveBeenCalled();
    });
  });

  it("should throw error if operators table is not empty in the DB, but the keys table is empty, and DB doesn't have information about chain ID and locator", async () => {
    jest.spyOn(operatorStorageService, 'find').mockImplementationOnce(() => Promise.resolve([operatorFixture]));

    jest.spyOn(appInfoStorageService, 'get').mockImplementationOnce(() => Promise.resolve(null));

    const updateAppInfoMock = jest.spyOn(appInfoStorageService, 'update');

    return networkValidationService.validate().catch((error: Error) => {
      expect(error).toBeInstanceOf(InconsistentDataInDBError);
      expect(error).toHaveProperty('type');

      const dbDataError = error as InconsistentDataInDBError;
      expect([InconsistentDataInDBErrorTypes.emptyKeys, InconsistentDataInDBErrorTypes.emptyModules]).toContain(
        dbDataError.type,
      );
      expect(dbDataError.type).not.toEqual(InconsistentDataInDBErrorTypes.emptyOperators);

      expect(updateAppInfoMock).not.toHaveBeenCalled();
    });
  });

  it("should throw error if keys table is not empty in the DB, but the module table is empty, and DB doesn't have information about chain ID and locator", async () => {
    jest.spyOn(registryKeyStorageService, 'find').mockImplementationOnce(() => Promise.resolve([keyFixture]));

    jest.spyOn(appInfoStorageService, 'get').mockImplementationOnce(() => Promise.resolve(null));

    const updateAppInfoMock = jest.spyOn(appInfoStorageService, 'update');

    return networkValidationService.validate().catch((error: Error) => {
      expect(error).toBeInstanceOf(InconsistentDataInDBError);
      expect(error).toHaveProperty('type');

      const dbDataError = error as InconsistentDataInDBError;
      expect([InconsistentDataInDBErrorTypes.emptyModules, InconsistentDataInDBErrorTypes.emptyOperators]).toContain(
        dbDataError.type,
      );
      expect(dbDataError.type).not.toEqual(InconsistentDataInDBErrorTypes.emptyKeys);

      expect(updateAppInfoMock).not.toHaveBeenCalled();
    });
  });

  it("should throw error if operators table is not empty in the DB, but the module table is empty, and DB doesn't have information about chain ID and locator", async () => {
    jest.spyOn(operatorStorageService, 'find').mockImplementationOnce(() => Promise.resolve([operatorFixture]));

    jest.spyOn(appInfoStorageService, 'get').mockImplementationOnce(() => Promise.resolve(null));

    const updateAppInfoMock = jest.spyOn(appInfoStorageService, 'update');

    return networkValidationService.validate().catch((error: Error) => {
      expect(error).toBeInstanceOf(InconsistentDataInDBError);
      expect(error).toHaveProperty('type');

      const dbDataError = error as InconsistentDataInDBError;
      expect([InconsistentDataInDBErrorTypes.emptyKeys, InconsistentDataInDBErrorTypes.emptyModules]).toContain(
        dbDataError.type,
      );
      expect(dbDataError.type).not.toEqual(InconsistentDataInDBErrorTypes.emptyOperators);

      expect(updateAppInfoMock).not.toHaveBeenCalled();
    });
  });

  it("should throw error if keys table is not empty in the DB, but the operators table is empty, and DB doesn't have information about chain ID and locator", async () => {
    jest.spyOn(registryKeyStorageService, 'find').mockImplementationOnce(() => Promise.resolve([keyFixture]));

    jest.spyOn(appInfoStorageService, 'get').mockImplementationOnce(() => Promise.resolve(null));

    const updateAppInfoMock = jest.spyOn(appInfoStorageService, 'update');

    return networkValidationService.validate().catch((error: Error) => {
      expect(error).toBeInstanceOf(InconsistentDataInDBError);
      expect(error).toHaveProperty('type');

      const dbDataError = error as InconsistentDataInDBError;
      expect([InconsistentDataInDBErrorTypes.emptyModules, InconsistentDataInDBErrorTypes.emptyOperators]).toContain(
        dbDataError.type,
      );
      expect(dbDataError.type).not.toEqual(InconsistentDataInDBErrorTypes.emptyKeys);

      expect(updateAppInfoMock).not.toHaveBeenCalled();
    });
  });

  it("should throw error if modules table is not empty in the DB, but the operators table is empty, and DB doesn't have information about chain ID and locator", async () => {
    jest
      .spyOn(moduleStorageService, 'findOneByModuleId')
      .mockImplementationOnce(() => Promise.resolve(holeskyCuratedModuleFixture));

    jest.spyOn(appInfoStorageService, 'get').mockImplementationOnce(() => Promise.resolve(null));

    const updateAppInfoMock = jest.spyOn(appInfoStorageService, 'update');

    return networkValidationService.validate().catch((error: Error) => {
      expect(error).toBeInstanceOf(InconsistentDataInDBError);
      expect(error).toHaveProperty('type');

      const dbDataError = error as InconsistentDataInDBError;
      expect([InconsistentDataInDBErrorTypes.emptyKeys, InconsistentDataInDBErrorTypes.emptyOperators]).toContain(
        dbDataError.type,
      );
      expect(dbDataError.type).not.toEqual(InconsistentDataInDBErrorTypes.emptyModules);

      expect(updateAppInfoMock).not.toHaveBeenCalled();
    });
  });

  it("should throw error if DB has information about keys, modules and operators, but doesn't have information about chain and locator, and address of the curated module stored in the DB doesn't match the correct address of the curated module for the chain for which the app was started", async () => {
    jest.spyOn(registryKeyStorageService, 'find').mockImplementationOnce(() => Promise.resolve([keyFixture]));

    const mainnetCuratedModuleFixture = {
      ...holeskyCuratedModuleFixture,
      stakingModuleAddress: REGISTRY_CONTRACT_ADDRESSES[1].toLowerCase(),
    };

    jest
      .spyOn(moduleStorageService, 'findOneByModuleId')
      .mockImplementationOnce(() => Promise.resolve(mainnetCuratedModuleFixture));

    jest.spyOn(operatorStorageService, 'find').mockImplementationOnce(() => Promise.resolve([operatorFixture]));

    jest.spyOn(appInfoStorageService, 'get').mockImplementationOnce(() => Promise.resolve(null));

    const updateAppInfoMock = jest.spyOn(appInfoStorageService, 'update');

    return networkValidationService.validate().catch((error: Error) => {
      expect(error).toBeInstanceOf(InconsistentDataInDBError);
      expect(error).toHaveProperty('type', InconsistentDataInDBErrorTypes.curatedModuleAddressMismatch);

      expect(updateAppInfoMock).not.toHaveBeenCalled();
    });
  });

  it("should throw error if DB has information about keys, modules and operators, but doesn't have information about chain and locator, and address of the curated module stored in the DB doesn't match the correct address of the curated module for the chain for which the app was started", async () => {
    jest.spyOn(configService, 'get').mockImplementation((path) => {
      if (path === 'VALIDATOR_REGISTRY_ENABLE') {
        return false;
      }

      if (path === 'CHAIN_ID') {
        return 1;
      }

      return configService.get(path);
    });

    jest.spyOn(executionProviderService, 'getChainId').mockImplementationOnce(() => Promise.resolve(1));

    jest.spyOn(registryKeyStorageService, 'find').mockImplementationOnce(() => Promise.resolve([keyFixture]));

    jest
      .spyOn(moduleStorageService, 'findOneByModuleId')
      .mockImplementationOnce(() => Promise.resolve(holeskyCuratedModuleFixture));

    jest.spyOn(operatorStorageService, 'find').mockImplementationOnce(() => Promise.resolve([operatorFixture]));

    jest.spyOn(appInfoStorageService, 'get').mockImplementationOnce(() => Promise.resolve(null));

    const updateAppInfoMock = jest.spyOn(appInfoStorageService, 'update');

    return networkValidationService.validate().catch((error: Error) => {
      expect(error).toBeInstanceOf(InconsistentDataInDBError);
      expect(error).toHaveProperty('type', InconsistentDataInDBErrorTypes.curatedModuleAddressMismatch);

      expect(updateAppInfoMock).not.toHaveBeenCalled();
    });
  });

  it("should execute successfully if DB has information about keys, modules, and operators, doesn't have information about chain and locator, and address of the curated module stored in the DB matches the address of the curated module for the chain for which the app was started", async () => {
    jest.spyOn(registryKeyStorageService, 'find').mockImplementationOnce(() => Promise.resolve([keyFixture]));

    jest
      .spyOn(moduleStorageService, 'findOneByModuleId')
      .mockImplementationOnce(() => Promise.resolve(holeskyCuratedModuleFixture));

    jest.spyOn(operatorStorageService, 'find').mockImplementationOnce(() => Promise.resolve([operatorFixture]));

    jest.spyOn(appInfoStorageService, 'get').mockImplementationOnce(() => Promise.resolve(null));

    const updateAppInfoMock = jest.spyOn(appInfoStorageService, 'update');

    await expect(networkValidationService.validate()).resolves.not.toThrow();
    expect(updateAppInfoMock).toBeCalledTimes(1);
    expect(updateAppInfoMock).toBeCalledWith({
      chainId: 17000,
      locatorAddress: '0x17000',
    });
  });
});
