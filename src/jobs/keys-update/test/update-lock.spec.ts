import { Test, TestingModule } from '@nestjs/testing';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from 'common/config';
import { JobService } from 'common/job';
import { PrometheusService } from 'common/prometheus';
import { ExecutionProviderService } from 'common/execution-provider';
import { StakingRouterService } from 'staking-router-modules/staking-router.service';
import { StakingRouterFetchService } from 'staking-router-modules/contracts';
import { ElMetaStorageService } from 'storage/el-meta.storage';
import { SRModuleStorageService } from 'storage/sr-module.storage';
import { EntityManager } from '@mikro-orm/knex';
import { KeysUpdateService } from '../keys-update.service';
import { StakingModuleUpdaterService } from '../staking-module-updater.service';

describe('KeysUpdateService update: advisory lock and re-read under it', () => {
  const currElMeta = { number: 200, hash: '0xcurr', timestamp: 2000 };
  const prevElMeta = { blockNumber: 100, blockHash: '0xprev', timestamp: 1000 };

  let keysUpdateService: KeysUpdateService;
  let updateStakingModules: jest.Mock;
  let elMetaGet: jest.Mock;
  let execute: jest.Mock;

  const build = async () => {
    updateStakingModules = jest.fn();
    execute = jest.fn().mockResolvedValue([{ locked: true }]);
    elMetaGet = jest.fn().mockResolvedValue(prevElMeta);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: LOGGER_PROVIDER, useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: JobService, useValue: {} },
        { provide: SchedulerRegistry, useValue: {} },
        { provide: StakingRouterService, useValue: {} },
        { provide: StakingRouterFetchService, useValue: { getStakingModules: jest.fn().mockResolvedValue([]) } },
        { provide: ElMetaStorageService, useValue: { get: (...args) => elMetaGet(...args) } },
        {
          provide: EntityManager,
          useValue: { transactional: (cb: (em: unknown) => Promise<unknown>) => cb({ execute }) },
        },
        { provide: ExecutionProviderService, useValue: { getBlock: jest.fn().mockResolvedValue(currElMeta) } },
        { provide: SRModuleStorageService, useValue: { findAll: jest.fn().mockResolvedValue([]) } },
        { provide: PrometheusService, useValue: {} },
        { provide: StakingModuleUpdaterService, useValue: { updateStakingModules } },
        KeysUpdateService,
      ],
    }).compile();

    keysUpdateService = module.get(KeysUpdateService);
  };

  it('skips the cycle without writing when another instance holds the lock', async () => {
    await build();
    execute.mockResolvedValue([{ locked: false }]);

    expect(await keysUpdateService.update()).toBeUndefined();
    expect(updateStakingModules).not.toHaveBeenCalled();
  });

  it('skips when the re-read under the lock sees a newer block', async () => {
    await build();
    elMetaGet
      .mockResolvedValueOnce(prevElMeta)
      .mockResolvedValueOnce({ blockNumber: 300, blockHash: '0xnewer', timestamp: 3000 });

    expect(await keysUpdateService.update()).toBeUndefined();
    expect(updateStakingModules).not.toHaveBeenCalled();
  });

  it('skips when the re-read under the lock sees the same block already stored', async () => {
    await build();
    elMetaGet
      .mockResolvedValueOnce(prevElMeta)
      .mockResolvedValueOnce({ blockNumber: 200, blockHash: '0xcurr', timestamp: 2000 });

    expect(await keysUpdateService.update()).toBeUndefined();
    expect(updateStakingModules).not.toHaveBeenCalled();
  });

  it('writes against the meta read under the lock, not the one read before it', async () => {
    await build();
    const metaUnderLock = { blockNumber: 150, blockHash: '0xmid', timestamp: 1500 };
    elMetaGet.mockResolvedValueOnce(prevElMeta).mockResolvedValueOnce(metaUnderLock);

    expect(await keysUpdateService.update()).toEqual(currElMeta);
    expect(updateStakingModules).toHaveBeenCalledWith(
      expect.objectContaining({ currElMeta, prevElMeta: metaUnderLock }),
    );
  });
});
