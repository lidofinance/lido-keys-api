import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionProviderService } from 'common/execution-provider';
import { StakingRouterService } from 'staking-router-modules/staking-router.service';
import { ElMetaStorageService } from 'storage/el-meta.storage';
import { SRModuleStorageService } from 'storage/sr-module.storage';
import { stakingModuleFixture, stakingModuleFixtures } from '../keys-update.fixtures';
import { StakingModuleUpdaterService } from '../staking-module-updater.service';

describe('update cases', () => {
  let updaterService: StakingModuleUpdaterService;
  let stakingRouterService: StakingRouterService;
  let sRModuleStorageService: SRModuleStorageService;
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
    loggerService = module.get(LOGGER_PROVIDER);
  });

  it('should be defined', () => {
    expect(updaterService).toBeDefined();
  });

  it('No past state found', async () => {
    const mockUpdate = jest.spyOn(updaterService, 'updateStakingModule').mockImplementation();
    await updaterService.updateStakingModules({
      currElMeta: { number: 1, hash: '0x1', timestamp: 1 },
      prevElMeta: null,
      contractModules: [stakingModuleFixture],
    });

    expect(mockUpdate).toBeCalledTimes(1);
    expect(loggerService.log.mock.calls[1][0]).toBe('No past state found, start indexing');
  });

  it('More than 1 module processed', async () => {
    const mockUpdate = jest.spyOn(updaterService, 'updateStakingModule').mockImplementation();
    await updaterService.updateStakingModules({
      currElMeta: { number: 1, hash: '0x1', timestamp: 1 },
      prevElMeta: null,
      contractModules: stakingModuleFixtures,
    });

    expect(mockUpdate).toBeCalledTimes(2);
  });

  it('Nonce has been changed', async () => {
    const mockUpdate = jest.spyOn(updaterService, 'updateStakingModule').mockImplementation();

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
      prevElMeta: { blockNumber: 1, blockHash: '0x2', timestamp: 1 },
      contractModules: stakingModuleFixtures,
    });

    expect(mockUpdate).toBeCalledTimes(2);
    expect(loggerService.log.mock.calls[1][0]).toBe('Nonce has been changed, start indexing');
  });

  it('Too much difference between the blocks', async () => {
    const mockUpdate = jest.spyOn(updaterService, 'updateStakingModule').mockImplementation();

    jest.spyOn(sRModuleStorageService, 'findOneById').mockImplementation(
      () =>
        ({
          nonce: 1,
        } as any),
    );

    await updaterService.updateStakingModules({
      currElMeta: { number: 100, hash: '0x1', timestamp: 1 },
      prevElMeta: { blockNumber: 2, blockHash: '0x2', timestamp: 1 },
      contractModules: stakingModuleFixtures,
    });

    expect(mockUpdate).toBeCalledTimes(2);
    expect(loggerService.log.mock.calls[1][0]).toBe('Too much difference between the blocks, start indexing');
  });

  it('Reorg detected', async () => {
    const mockUpdate = jest.spyOn(updaterService, 'updateStakingModule').mockImplementation();

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
      prevElMeta: { blockNumber: 2, blockHash: '0x1', timestamp: 1 },
      contractModules: stakingModuleFixtures,
    });

    expect(mockUpdate).toBeCalledTimes(2);
    expect(loggerService.log.mock.calls[1][0]).toBe('Reorg detected, start indexing');
  });
});
