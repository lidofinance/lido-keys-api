import { ValidatorsService } from './validators.service';
import { VALIDATORS_STATUSES_FOR_EXIT } from './validators.constants';

describe('ValidatorsService', () => {
  it('fetches only the statuses the exit endpoints read', async () => {
    const registry = { updateStream: jest.fn().mockResolvedValue({}) };
    const config = { get: jest.fn().mockReturnValue(true) };
    const logger = { warn: jest.fn() };

    const service = new ValidatorsService(logger as any, registry as any, config as any);
    await service.updateValidators('finalized');

    expect(registry.updateStream).toBeCalledWith('finalized', { status: VALIDATORS_STATUSES_FOR_EXIT });
  });
});
