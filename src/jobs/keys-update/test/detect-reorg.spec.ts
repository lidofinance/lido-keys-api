import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionProviderService } from 'common/execution-provider';
import { StakingRouterService } from 'staking-router-modules/staking-router.service';
import { ElMetaStorageService } from 'storage/el-meta.storage';
import { SRModuleStorageService } from 'storage/sr-module.storage';
import { UpdaterState } from '../keys-update.interfaces';
import { StakingModuleUpdaterService } from '../staking-module-updater.service';

describe('detect reorg', () => {
  let updaterService: StakingModuleUpdaterService;
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
    executionProviderService = module.get<ExecutionProviderService>(ExecutionProviderService);
  });

  it('should be defined', () => {
    expect(updaterService).toBeDefined();
  });

  it('parent hash of the currentBlock matches the hash of the prevBlock', async () => {
    const updaterState: UpdaterState = {
      lastChangedBlockHash: '0x1',
      isReorgDetected: false,
    };

    jest
      .spyOn(executionProviderService, 'getFullBlock')
      .mockImplementationOnce(async () => ({ number: 2, hash: '0x2', timestamp: 1, parentHash: '0x1' } as any));

    jest
      .spyOn(executionProviderService, 'getFullBlock')
      .mockImplementationOnce(async () => ({ number: 1, hash: '0x1', timestamp: 1, parentHash: '0x0' } as any));

    expect(await updaterService.isReorgDetected(updaterState, '0x1', '0x2')).toBeFalsy();
    expect(updaterState.isReorgDetected).toBeFalsy();
  });

  it('same block number but different hashes', async () => {
    const updaterState: UpdaterState = {
      lastChangedBlockHash: '0x1',
      isReorgDetected: false,
    };

    jest
      .spyOn(executionProviderService, 'getFullBlock')
      .mockImplementationOnce(async () => ({ number: 2, hash: '0x2', timestamp: 1, parentHash: '0x2' } as any));

    jest
      .spyOn(executionProviderService, 'getFullBlock')
      .mockImplementationOnce(async () => ({ number: 2, hash: '0x1', timestamp: 1, parentHash: '0x0' } as any));

    expect(await updaterService.isReorgDetected(updaterState, '0x1', '0x2')).toBeTruthy();
    expect(updaterState.isReorgDetected).toBeTruthy();
  });

  it('check blockchain (happy pass)', async () => {
    const updaterState: UpdaterState = {
      lastChangedBlockHash: '0x0',
      isReorgDetected: false,
    };

    jest
      .spyOn(executionProviderService, 'getFullBlock')
      .mockImplementationOnce(async () => ({ number: 100, hash: '0x100', timestamp: 1, parentHash: '0x99' } as any));

    jest
      .spyOn(executionProviderService, 'getFullBlock')
      .mockImplementationOnce(async () => ({ number: 1, hash: '0x1', timestamp: 1, parentHash: '0x0' } as any));

    jest.spyOn(executionProviderService, 'getFullBlock').mockImplementation(
      async (blockHashOrBlockTag: string | number) =>
        ({
          number: Number(blockHashOrBlockTag),
          hash: `0x${blockHashOrBlockTag}`,
          timestamp: 1,
          parentHash: `0x${Number(blockHashOrBlockTag) - 1}`,
        } as any),
    );

    expect(await updaterService.isReorgDetected(updaterState, '0x1', '0x100')).toBeFalsy();
    expect(updaterState.isReorgDetected).toBeFalsy();
  });

  it('check blockchain (parent hash does not match)', async () => {
    const updaterState: UpdaterState = {
      lastChangedBlockHash: '0x1',
      isReorgDetected: false,
    };

    jest
      .spyOn(executionProviderService, 'getFullBlock')
      .mockImplementationOnce(async () => ({ number: 100, hash: '0x100', timestamp: 1, parentHash: '0x99' } as any));

    jest
      .spyOn(executionProviderService, 'getFullBlock')
      .mockImplementationOnce(async () => ({ number: 1, hash: '0x1', timestamp: 1, parentHash: '0x0' } as any));

    jest.spyOn(executionProviderService, 'getFullBlock').mockImplementation(
      async (blockHashOrBlockTag: string | number) =>
        ({
          number: Number(blockHashOrBlockTag),
          hash: `0x${blockHashOrBlockTag}`,
          timestamp: 1,
          parentHash: `0xSORRY`,
        } as any),
    );

    expect(await updaterService.isReorgDetected(updaterState, '0x1', '0x100')).toBeTruthy();
    expect(updaterState.isReorgDetected).toBeTruthy();
  });
});
