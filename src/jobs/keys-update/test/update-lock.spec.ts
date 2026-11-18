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
  let contractModulesGet: jest.Mock;
  let storageModulesGet: jest.Mock;

  const build = async () => {
    updateStakingModules = jest.fn();
    contractModulesGet = jest.fn().mockResolvedValue([]);
    storageModulesGet = jest.fn().mockResolvedValue([]);
    execute = jest.fn().mockResolvedValue([{ locked: true }]);
    elMetaGet = jest.fn().mockResolvedValue(prevElMeta);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: LOGGER_PROVIDER, useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: JobService, useValue: {} },
        { provide: SchedulerRegistry, useValue: {} },
        { provide: StakingRouterService, useValue: {} },
        {
          provide: StakingRouterFetchService,
          useValue: { getStakingModules: (...args) => contractModulesGet(...args) },
        },
        { provide: ElMetaStorageService, useValue: { get: (...args) => elMetaGet(...args) } },
        {
          provide: EntityManager,
          useValue: { transactional: (cb: (em: unknown) => Promise<unknown>) => cb({ execute }) },
        },
        { provide: ExecutionProviderService, useValue: { getBlock: jest.fn().mockResolvedValue(currElMeta) } },
        { provide: SRModuleStorageService, useValue: { findAll: (...args) => storageModulesGet(...args) } },
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

  describe('a stored module id that points to another address', () => {
    // The storage keeps the address lowercase; the comparison must not depend on the letter case
    const address = '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5';
    const otherAddress = '0xaE7B191A31f627b4eB1d4DaC64eab9976995b433';

    let exit: jest.SpyInstance;

    beforeEach(async () => {
      await build();
      storageModulesGet.mockResolvedValue([{ moduleId: 1, stakingModuleAddress: address.toLowerCase() }]);
      exit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit');
      });
    });

    afterEach(() => exit.mockRestore());

    it('does not exit for the same address in another letter case', async () => {
      contractModulesGet.mockResolvedValue([{ moduleId: 1, stakingModuleAddress: address }]);

      expect(await keysUpdateService.update()).toEqual(currElMeta);
      expect(exit).not.toHaveBeenCalled();
      expect(updateStakingModules).toHaveBeenCalled();
    });

    it('exits with code 1 for another address', async () => {
      contractModulesGet.mockResolvedValue([{ moduleId: 1, stakingModuleAddress: otherAddress }]);

      await expect(keysUpdateService.update()).rejects.toThrow('process.exit');
      expect(exit).toHaveBeenCalledWith(1);
      expect(updateStakingModules).not.toHaveBeenCalled();
    });
  });
});
