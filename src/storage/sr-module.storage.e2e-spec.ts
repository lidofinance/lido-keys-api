import { Test } from '@nestjs/testing';
import { StorageModule } from './storage.module';
import { SRModuleStorageService } from './sr-module.storage';
import { MikroORM } from '@mikro-orm/core';
import { curatedModule, dvtModule, updatedCuratedModule } from '../http/db.fixtures';
import { DatabaseE2ETestingModule } from 'app';

describe('Staking Module Storage', () => {
  let srModuleStorageService: SRModuleStorageService;
  let mikroOrm: MikroORM;

  beforeEach(async () => {
    const imports = [DatabaseE2ETestingModule, StorageModule];

    const moduleRef = await Test.createTestingModule({ imports }).compile();
    srModuleStorageService = moduleRef.get(SRModuleStorageService);
    mikroOrm = moduleRef.get(MikroORM);

    const generator = mikroOrm.getSchemaGenerator();
    await generator.refreshDatabase();
    await generator.clearDatabase();
  });

  afterEach(async () => {
    await srModuleStorageService.removeAll();
    await mikroOrm.close();
  });

  test('add new module in empty database', async () => {
    const nonce = 1;
    await srModuleStorageService.upsert(curatedModule, nonce);
    const updatesStakingModules0 = await srModuleStorageService.findAll();
    const stakingModule0 = updatesStakingModules0[0];

    expect(updatesStakingModules0.length).toEqual(1);

    expect(stakingModule0.nonce).toEqual(nonce);
    expect(stakingModule0.stakingModuleAddress).toEqual(curatedModule.stakingModuleAddress);
    expect(stakingModule0.name).toEqual(curatedModule.name);
    expect(stakingModule0.moduleId).toEqual(curatedModule.moduleId);
    expect(stakingModule0.type).toEqual(curatedModule.type);
    expect(stakingModule0.status).toEqual(curatedModule.status);
    expect(stakingModule0.exitedValidatorsCount).toEqual(curatedModule.exitedValidatorsCount);
    expect(stakingModule0.treasuryFee).toEqual(curatedModule.treasuryFee);
    expect(stakingModule0.targetShare).toEqual(curatedModule.targetShare);
    expect(stakingModule0.moduleFee).toEqual(curatedModule.moduleFee);
    expect(stakingModule0.lastDepositBlock).toEqual(curatedModule.lastDepositBlock);
    expect(stakingModule0.lastDepositAt).toEqual(curatedModule.lastDepositAt);
    expect(stakingModule0.active).toEqual(curatedModule.active);

    const dvtNonce = 2;
    await srModuleStorageService.upsert(dvtModule, dvtNonce);
    const updatesStakingModules1 = await srModuleStorageService.findAll();
    expect(updatesStakingModules1.length).toEqual(2);
    const stakingModule1 = updatesStakingModules1[1];

    expect(stakingModule1.nonce).toEqual(dvtNonce);
    expect(stakingModule1.stakingModuleAddress).toEqual(dvtModule.stakingModuleAddress);
    expect(stakingModule1.name).toEqual(dvtModule.name);
    expect(stakingModule1.moduleId).toEqual(dvtModule.moduleId);
    expect(stakingModule1.type).toEqual(dvtModule.type);
    expect(stakingModule1.status).toEqual(dvtModule.status);
    expect(stakingModule1.exitedValidatorsCount).toEqual(dvtModule.exitedValidatorsCount);
    expect(stakingModule1.treasuryFee).toEqual(dvtModule.treasuryFee);
    expect(stakingModule1.targetShare).toEqual(dvtModule.targetShare);
    expect(stakingModule1.moduleFee).toEqual(dvtModule.moduleFee);
    expect(stakingModule1.lastDepositBlock).toEqual(dvtModule.lastDepositBlock);
    expect(stakingModule1.lastDepositAt).toEqual(dvtModule.lastDepositAt);
    expect(stakingModule1.active).toEqual(dvtModule.active);
  });

  test('update existing module', async () => {
    const nonce = 1;
    await srModuleStorageService.upsert(curatedModule, nonce);
    const initialStakingModules = await srModuleStorageService.findAll();
    const initialStakingModulesAmount = initialStakingModules.length;
    const stakingModule0 = initialStakingModules[0];
    expect(initialStakingModulesAmount).toEqual(1);

    expect(stakingModule0.nonce).toEqual(nonce);
    expect(stakingModule0.stakingModuleAddress).toEqual(curatedModule.stakingModuleAddress);
    expect(stakingModule0.name).toEqual(curatedModule.name);
    expect(stakingModule0.moduleId).toEqual(curatedModule.moduleId);
    expect(stakingModule0.type).toEqual(curatedModule.type);
    expect(stakingModule0.status).toEqual(curatedModule.status);
    expect(stakingModule0.exitedValidatorsCount).toEqual(curatedModule.exitedValidatorsCount);
    expect(stakingModule0.treasuryFee).toEqual(curatedModule.treasuryFee);
    expect(stakingModule0.targetShare).toEqual(curatedModule.targetShare);
    expect(stakingModule0.moduleFee).toEqual(curatedModule.moduleFee);
    expect(stakingModule0.lastDepositBlock).toEqual(curatedModule.lastDepositBlock);
    expect(stakingModule0.lastDepositAt).toEqual(curatedModule.lastDepositAt);
    expect(stakingModule0.active).toEqual(curatedModule.active);

    const updatedNonce = 12;
    await srModuleStorageService.upsert(updatedCuratedModule, updatedNonce);

    const updatedStakingModules = await srModuleStorageService.findAll();
    const updatedStakingModulesAmount = updatedStakingModules.length;
    const updatedStakingModule0 = updatedStakingModules[0];
    expect(updatedStakingModulesAmount).toEqual(1);

    expect(updatedStakingModule0.nonce).toEqual(updatedNonce);
    // updatedCuratedModule contains new address, but during upsert it was not changed
    expect(updatedStakingModule0.stakingModuleAddress).toEqual(curatedModule.stakingModuleAddress);

    expect(updatedStakingModule0.name).toEqual(updatedCuratedModule.name);
    // didn't change
    expect(updatedStakingModule0.moduleId).toEqual(curatedModule.moduleId);
    expect(updatedStakingModule0.type).toEqual(updatedCuratedModule.type);
    expect(updatedStakingModule0.status).toEqual(updatedCuratedModule.status);
    expect(updatedStakingModule0.exitedValidatorsCount).toEqual(updatedCuratedModule.exitedValidatorsCount);
    expect(updatedStakingModule0.treasuryFee).toEqual(updatedCuratedModule.treasuryFee);
    expect(updatedStakingModule0.targetShare).toEqual(updatedCuratedModule.targetShare);
    expect(updatedStakingModule0.moduleFee).toEqual(updatedCuratedModule.moduleFee);
    expect(updatedStakingModule0.lastDepositBlock).toEqual(updatedCuratedModule.lastDepositBlock);
    expect(updatedStakingModule0.lastDepositAt).toEqual(updatedCuratedModule.lastDepositAt);
    expect(updatedStakingModule0.active).toEqual(updatedCuratedModule.active);

    // interesting observation, that initialStakingModules[0] changed value
    expect(initialStakingModules[0].nonce).toEqual(updatedNonce);
  });

  test('check search by contract address', async () => {
    const nonce = 1;
    await srModuleStorageService.upsert(curatedModule, nonce);
    await srModuleStorageService.upsert(dvtModule, nonce);
    const curatedModuleDb = await srModuleStorageService.findOneByContractAddress(curatedModule.stakingModuleAddress);
    const dvtModuleDb = await srModuleStorageService.findOneByContractAddress(dvtModule.stakingModuleAddress);

    expect(curatedModuleDb?.moduleId).toEqual(curatedModule.moduleId);
    expect(dvtModuleDb?.moduleId).toEqual(dvtModule.moduleId);
  });

  test('check that contract address was written in a lower case', async () => {
    const nonce = 1;
    await srModuleStorageService.upsert(
      { ...curatedModule, stakingModuleAddress: '0xDC64A140AA3E981100A9BECA4E685F962F0CF6C9' },
      nonce,
    );
    const stakingModuleNull = await srModuleStorageService.findOneByContractAddress(
      '0xDC64A140AA3E981100A9BECA4E685F962F0CF6C9',
    );

    expect(stakingModuleNull).toEqual(null);

    const stakingModule = await srModuleStorageService.findOneByContractAddress(
      '0xdc64a140aa3e981100a9beca4e685f962f0cf6c9',
    );

    expect(stakingModule?.stakingModuleAddress).toEqual('0xdc64a140aa3e981100a9beca4e685f962f0cf6c9');
    expect(stakingModule?.moduleId).toEqual(curatedModule.moduleId);
  });
});
