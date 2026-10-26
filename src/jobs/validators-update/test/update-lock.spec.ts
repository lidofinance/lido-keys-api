import { Test, TestingModule } from '@nestjs/testing';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from 'common/config';
import { JobService } from 'common/job';
import { PrometheusService } from 'common/prometheus';
import { ValidatorsService } from 'validators';
import { EntityManager } from '@mikro-orm/knex';
import { ValidatorsUpdateService } from '../validators-update.service';

describe('ValidatorsUpdateService update: advisory lock around the registry write', () => {
  const meta = {
    epoch: 10,
    slot: 320,
    slotStateRoot: '0xstate',
    blockNumber: 200,
    blockHash: '0xcurr',
    timestamp: 2000,
  };

  let validatorsUpdateService: ValidatorsUpdateService;
  let updateValidators: jest.Mock;
  let execute: jest.Mock;

  const build = async () => {
    updateValidators = jest.fn().mockResolvedValue(meta);
    execute = jest.fn().mockResolvedValue([{ locked: true }]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: LOGGER_PROVIDER, useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: JobService, useValue: {} },
        { provide: SchedulerRegistry, useValue: {} },
        { provide: PrometheusService, useValue: {} },
        { provide: ValidatorsService, useValue: { updateValidators: (...args) => updateValidators(...args) } },
        {
          provide: EntityManager,
          useValue: { transactional: (cb: (em: unknown) => Promise<unknown>) => cb({ execute }) },
        },
        ValidatorsUpdateService,
      ],
    }).compile();

    validatorsUpdateService = module.get(ValidatorsUpdateService);
  };

  it('skips the cycle without writing when another instance holds the lock', async () => {
    await build();
    execute.mockResolvedValue([{ locked: false }]);

    expect(await validatorsUpdateService['updateValidatorsUnderLock']()).toBeNull();
    expect(updateValidators).not.toHaveBeenCalled();
  });

  it('writes the finalized state when it takes the lock', async () => {
    await build();

    expect(await validatorsUpdateService['updateValidatorsUnderLock']()).toEqual(meta);
    expect(updateValidators).toHaveBeenCalledWith('finalized');
  });

  it('takes a lock of its own, not the one the keys update takes', async () => {
    await build();

    await validatorsUpdateService['updateValidatorsUnderLock']();
    expect(execute).toHaveBeenCalledWith(expect.stringContaining('lido-keys-api:validators-update'));
  });
});
