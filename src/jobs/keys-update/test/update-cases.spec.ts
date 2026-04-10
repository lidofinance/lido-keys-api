import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionProviderService } from 'common/execution-provider';
import { StakingRouterService } from 'staking-router-modules/staking-router.service';
import { ElMetaStorageService } from 'storage/el-meta.storage';
import { SRModuleStorageService } from 'storage/sr-module.storage';
import { stakingModuleFixture, stakingModuleFixtures } from './keys-update.fixtures';
import { StakingModuleUpdaterService } from '../staking-module-updater.service';
import { UpdaterState } from '../keys-update.interfaces';

describe('update cases', () => {
  let updaterService: StakingModuleUpdaterService;
  let stakingRouterService: StakingRouterService;
  let sRModuleStorageService: SRModuleStorageService;
  let elMetaStorageService: ElMetaStorageService;
  let loggerService: { log: jest.Mock<any, any> };
  let executionProviderService: ExecutionProviderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: LOGGER_PROVIDER,
          useValue: {
            log: jest.fn(),
          },
        },
        {
          provide: StakingRouterService,
          useValue: {
            getStakingRouterModuleImpl: () => ({
              getCurrentNonce() {
                return 1;
              },
            }),
          },
        },
        {
          provide: ElMetaStorageService,
          useValue: {
            update: jest.fn(),
          },
        },
        {
          provide: ExecutionProviderService,
          useValue: {
            getFullBlock: jest.fn(),
          },
        },
        {
          provide: SRModuleStorageService,
          useValue: {
            findOneById: jest.fn(),
            upsert: jest.fn(),
          },
        },
        StakingModuleUpdaterService,
      ],
    }).compile();

    updaterService = module.get<StakingModuleUpdaterService>(StakingModuleUpdaterService);
    stakingRouterService = module.get<StakingRouterService>(StakingRouterService);
    sRModuleStorageService = module.get<SRModuleStorageService>(SRModuleStorageService);
    executionProviderService = module.get<ExecutionProviderService>(ExecutionProviderService);
    elMetaStorageService = module.get<ElMetaStorageService>(ElMetaStorageService);
    loggerService = module.get(LOGGER_PROVIDER);
  });

  it('should be defined', () => {
    expect(updaterService).toBeDefined();
  });

  it('No past state found', async () => {
    const mockUpdate = jest
      .spyOn(updaterService, 'updateStakingModule')
      .mockImplementation(async (updaterState: UpdaterState, _a, _b, _c, _d, currBh: string) => {
        updaterState.lastChangedBlockHash = currBh;
      });
    const mockElUpdate = jest.spyOn(elMetaStorageService, 'update').mockImplementation();

    await updaterService.updateStakingModules({
      currElMeta: { number: 1, hash: '0x1', timestamp: 1 },
      prevElMeta: null,
      contractModules: [stakingModuleFixture],
    });

    expect(mockUpdate).toBeCalledTimes(1);
    expect(loggerService.log.mock.calls[1][0]).toBe('No past state found, start updating');
    expect(mockElUpdate).toBeCalledTimes(1);
    expect(mockElUpdate).toHaveBeenCalledWith(expect.objectContaining({ lastChangedBlockHash: '0x1' }));
  });

  it('More than 1 module processed', async () => {
    const mockUpdate = jest
      .spyOn(updaterService, 'updateStakingModule')
      .mockImplementation(async (updaterState: UpdaterState, _a, _b, _c, _d, currBh: string) => {
        updaterState.lastChangedBlockHash = currBh;
      });
    const mockElUpdate = jest.spyOn(elMetaStorageService, 'update').mockImplementation();

    await updaterService.updateStakingModules({
      currElMeta: { number: 1, hash: '0x1', timestamp: 1 },
      prevElMeta: null,
      contractModules: stakingModuleFixtures,
    });

    expect(mockUpdate).toBeCalledTimes(2);
    expect(mockElUpdate).toBeCalledTimes(1);
    expect(mockElUpdate).toHaveBeenCalledWith(expect.objectContaining({ lastChangedBlockHash: '0x1' }));
  });

  it('Nonce has been changed', async () => {
    const mockUpdate = jest
      .spyOn(updaterService, 'updateStakingModule')
      .mockImplementation(async (updaterState: UpdaterState, _a, _b, _c, _d, currBh: string) => {
        updaterState.lastChangedBlockHash = currBh;
      });
    const mockElUpdate = jest.spyOn(elMetaStorageService, 'update').mockImplementation();

    jest.spyOn(stakingRouterService, 'getStakingRouterModuleImpl').mockImplementation(
      () =>
        ({
          getCurrentNonce() {
            return 1;
          },
        } as any),
    );

    jest.spyOn(sRModuleStorageService, 'findOneById').mockImplementation(
      () =>
        ({
          nonce: 0,
        } as any),
    );

    await updaterService.updateStakingModules({
      currElMeta: { number: 2, hash: '0x1', timestamp: 1 },
      prevElMeta: { blockNumber: 1, blockHash: '0x0', timestamp: 1, lastChangedBlockHash: '0xNOPE' },
      contractModules: stakingModuleFixtures,
    });

    expect(mockUpdate).toBeCalledTimes(2);
    expect(loggerService.log.mock.calls[1][0]).toBe('Nonce has been changed, start updating');

    expect(mockElUpdate).toBeCalledTimes(1);
    expect(mockElUpdate).toHaveBeenCalledWith(expect.objectContaining({ lastChangedBlockHash: '0x1' }));
  });

  it('Too much difference between the blocks', async () => {
    const mockUpdate = jest
      .spyOn(updaterService, 'updateStakingModule')
      .mockImplementation(async (updaterState: UpdaterState, _a, _b, _c, _d, currBh: string) => {
        updaterState.lastChangedBlockHash = currBh;
      });
    const mockElUpdate = jest.spyOn(elMetaStorageService, 'update').mockImplementation();
    jest.spyOn(sRModuleStorageService, 'findOneById').mockImplementation(
      () =>
        ({
          nonce: 1,
        } as any),
    );

    await updaterService.updateStakingModules({
      currElMeta: { number: 100, hash: '0x1', timestamp: 1 },
      prevElMeta: { blockNumber: 2, blockHash: '0x0', timestamp: 1, lastChangedBlockHash: '0xNOPE' },
      contractModules: stakingModuleFixtures,
    });

    expect(mockUpdate).toBeCalledTimes(2);
    expect(loggerService.log.mock.calls[1][0]).toBe('Too much difference between the blocks, start updating');
    expect(mockElUpdate).toBeCalledTimes(1);
    expect(mockElUpdate).toHaveBeenCalledWith(expect.objectContaining({ lastChangedBlockHash: '0x1' }));
  });

  it('Reorg detected', async () => {
    const mockUpdate = jest
      .spyOn(updaterService, 'updateStakingModule')
      .mockImplementation(async (updaterState: UpdaterState, _a, _b, _c, _d, currBh: string) => {
        updaterState.lastChangedBlockHash = currBh;
      });
    const mockElUpdate = jest.spyOn(elMetaStorageService, 'update').mockImplementation();
    jest.spyOn(sRModuleStorageService, 'findOneById').mockImplementation(
      () =>
        ({
          nonce: 1,
        } as any),
    );

    jest
      .spyOn(executionProviderService, 'getFullBlock')
      .mockImplementationOnce(async () => ({ number: 2, hash: '0x2', timestamp: 1, parentHash: '0x111' } as any));

    jest
      .spyOn(executionProviderService, 'getFullBlock')
      .mockImplementationOnce(async () => ({ number: 2, hash: '0x1', timestamp: 1, parentHash: '0x111' } as any));
    await updaterService.updateStakingModules({
      currElMeta: { number: 2, hash: '0x2', timestamp: 1 },
      prevElMeta: { blockNumber: 2, blockHash: '0x1', timestamp: 1, lastChangedBlockHash: '0xNOPE' },
      contractModules: stakingModuleFixtures,
    });

    expect(mockUpdate).toBeCalledTimes(2);
    expect(loggerService.log.mock.calls[1][0]).toBe('Reorg detected, start updating');
    expect(mockElUpdate).toBeCalledTimes(1);
    expect(mockElUpdate).toHaveBeenCalledWith(expect.objectContaining({ lastChangedBlockHash: '0x2' }));
  });

  it('Module metadata updated when no conditions triggered', async () => {
    const moduleInStorageMock = {
      nonce: 1,
      lastChangedBlockHash: '0xPREV',
      withdrawalCredentialsType: 1,
    };

    jest.spyOn(sRModuleStorageService, 'findOneById').mockResolvedValue(moduleInStorageMock as any);

    jest.spyOn(stakingRouterService, 'getStakingRouterModuleImpl').mockReturnValue({
      getCurrentNonce: jest.fn().mockResolvedValue(1),
      operatorsWereChanged: jest.fn().mockResolvedValue(false),
    } as any);

    jest
      .spyOn(executionProviderService, 'getFullBlock')
      .mockResolvedValueOnce({ number: 3, hash: '0x3', timestamp: 1, parentHash: '0x2' } as any)
      .mockResolvedValueOnce({ number: 2, hash: '0x2', timestamp: 1, parentHash: '0x1' } as any);

    const mockUpdateStakingModule = jest.spyOn(updaterService, 'updateStakingModule');
    const mockUpsert = jest.spyOn(sRModuleStorageService, 'upsert');
    const mockElUpdate = jest.spyOn(elMetaStorageService, 'update').mockImplementation();

    const contractModuleWithNewWCType = { ...stakingModuleFixture, withdrawalCredentialsType: 2 };

    await updaterService.updateStakingModules({
      currElMeta: { number: 3, hash: '0x3', timestamp: 1 },
      prevElMeta: { blockNumber: 2, blockHash: '0x2', timestamp: 1, lastChangedBlockHash: '0xPREV' },
      contractModules: [contractModuleWithNewWCType],
    });

    expect(mockUpdateStakingModule).not.toHaveBeenCalled();
    expect(mockUpsert).toHaveBeenCalledWith(contractModuleWithNewWCType, 1, '0xPREV');
    expect(mockElUpdate).toHaveBeenCalledWith(expect.objectContaining({ lastChangedBlockHash: '0xPREV' }));
  });

  it('New module not in storage triggers full update', async () => {
    jest.spyOn(sRModuleStorageService, 'findOneById').mockResolvedValue(null);

    const mockUpdate = jest
      .spyOn(updaterService, 'updateStakingModule')
      .mockImplementation(async (updaterState: UpdaterState, _a, _b, _c, _d, currBh: string) => {
        updaterState.lastChangedBlockHash = currBh;
      });
    const mockElUpdate = jest.spyOn(elMetaStorageService, 'update').mockImplementation();

    await updaterService.updateStakingModules({
      currElMeta: { number: 3, hash: '0x3', timestamp: 1 },
      prevElMeta: { blockNumber: 2, blockHash: '0x2', timestamp: 1, lastChangedBlockHash: '0xPREV' },
      contractModules: [stakingModuleFixture],
    });

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(loggerService.log.mock.calls[1][0]).toBe('No past state found, start updating');
    expect(mockElUpdate).toHaveBeenCalledWith(expect.objectContaining({ lastChangedBlockHash: '0x3' }));
  });
});
