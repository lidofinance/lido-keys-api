import { Test } from '@nestjs/testing';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { StorageModule } from './storage.module';
import { SRModuleStorageService } from './sr-module.storage';
import { MikroORM } from '@mikro-orm/core';
import { curatedModule, dvtModule } from '../http/module.fixture';

describe('Staking Module Storage', () => {
  let srModuleStorageService: SRModuleStorageService;
  let mikroOrm: MikroORM;

  beforeEach(async () => {
    const imports = [
      MikroOrmModule.forRoot({
        dbName: ':memory:',
        type: 'sqlite',
        allowGlobalContext: true,
        entities: ['./**/*.entity.ts'],
      }),
      StorageModule,
    ];

    const moduleRef = await Test.createTestingModule({ imports }).compile();
    srModuleStorageService = moduleRef.get(SRModuleStorageService);
    mikroOrm = moduleRef.get(MikroORM);

    const generator = mikroOrm.getSchemaGenerator();
    await generator.updateSchema();
  });

  afterEach(async () => {
    await srModuleStorageService.removeAll();
    await mikroOrm.close();
  });

  test('add new module', async () => {
    const nonce = 1;
    const stakingModule = await srModuleStorageService.upsert(curatedModule, nonce);
    const updatesStakingModules = await srModuleStorageService.findAll();

    expect(updatesStakingModules).toEqual(expect.arrayContaining([stakingModule]));
  });

  test('check search by contract address', async () => {
    const nonce = 1;
    await srModuleStorageService.upsert(curatedModule, nonce);
    await srModuleStorageService.upsert(dvtModule, nonce);
    const curatedModuleDb = await srModuleStorageService.findOneByContractAddress(curatedModule.stakingModuleAddress);

    expect(curatedModuleDb?.moduleId).toEqual(curatedModule.moduleId);
  });
});
