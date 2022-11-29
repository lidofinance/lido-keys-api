import { Test } from '@nestjs/testing';
import { ModulesController, ModulesService } from '../../src/http/modules';
import { ConfigService } from '../../src/common/config';

describe('Sources controller', () => {
  let modulesController: ModulesController;

  class ConfigServiceMock {
    get(value) {
      return process.env[value];
    }
  }

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ModulesController],
      providers: [
        ModulesService,
        {
          provide: ConfigService,
          useClass: ConfigServiceMock,
        },
      ],
    }).compile();

    modulesController = moduleRef.get<ModulesController>(ModulesController);
  });

  test('mainnet', () => {
    // set process.env
    process.env['CHAIN_ID'] = '1';

    expect(modulesController.get()).toEqual({
      data: [
        {
          address: '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5',
          type: 'Curated',
          description: 'NodeOperatorRegistry contract',
        },
      ],
    });
  });

  test('goerli', () => {
    // set process.env
    process.env['CHAIN_ID'] = '5';

    expect(modulesController.get()).toEqual({
      data: [
        {
          address: '0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320',
          type: 'Curated',
          description: 'NodeOperatorRegistry contract',
        },
      ],
    });
  });
});
