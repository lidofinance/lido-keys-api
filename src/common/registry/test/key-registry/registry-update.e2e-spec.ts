import { Global, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { nullTransport, LoggerModule, MockLoggerModule, LOGGER_PROVIDER } from '@lido-nestjs/logger';
import {
  KeyRegistryModule,
  KeyRegistryService,
  RegistryStorageService,
  RegistryKeyStorageService,
  RegistryOperatorStorageService,
  RegistryKeyBatchFetchService,
} from 'common/registry';
import { keys, newKey, operators } from '../fixtures/db.fixture';
import { clone, compareTestKeysAndOperators, compareTestKeys, compareTestOperators, clearDb } from '../testing.utils';
import { registryServiceMock } from '../mock-utils';
import { DatabaseE2ETestingModule } from 'app';
import { MikroORM } from '@mikro-orm/core';
import { REGISTRY_CONTRACT_TOKEN } from 'common/contracts';
import { PrometheusModule } from 'common/prometheus';
import { Registry__factory } from 'generated';
import { getNetwork } from '@ethersproject/networks';
import { Interface } from '@ethersproject/abi';
import { JsonRpcBatchProvider } from '@ethersproject/providers';
import { operatorFields, operatorSummary, operatorSummaryFields } from '../fixtures/operator.fixture';

// blockHash is unused by mocks — any string works
const blockHash = '0x0';

const address = '0x' + 'aa'.repeat(20);

const mockConnectRegistry = jest.fn();

@Global()
@Module({
  providers: [{ provide: REGISTRY_CONTRACT_TOKEN, useValue: mockConnectRegistry }],
  exports: [REGISTRY_CONTRACT_TOKEN],
})
class MockContractsModule {}

describe('Registry update', () => {
  const keysWithModuleAddress = keys.map((key) => {
    return { ...key, moduleAddress: address };
  });

  const operatorsWithModuleAddress = operators.map((operator) => {
    return { ...operator, moduleAddress: address };
  });

  let registryService: KeyRegistryService;
  let registryStorageService: RegistryStorageService;

  let keyStorageService: RegistryKeyStorageService;
  let operatorStorageService: RegistryOperatorStorageService;
  let mikroOrm: MikroORM;

  let moduleRef: TestingModule;

  beforeEach(async () => {
    const imports = [
      MockContractsModule,
      DatabaseE2ETestingModule.forRoot(),
      LoggerModule.forRoot({ transports: [nullTransport()] }),
      KeyRegistryModule.forFeature(),
      PrometheusModule,
    ];

    moduleRef = await Test.createTestingModule({ imports }).compile();
    registryService = moduleRef.get(KeyRegistryService);
    registryStorageService = moduleRef.get(RegistryStorageService);

    keyStorageService = moduleRef.get(RegistryKeyStorageService);
    operatorStorageService = moduleRef.get(RegistryOperatorStorageService);

    mikroOrm = moduleRef.get(MikroORM);
    const generator = moduleRef.get(MikroORM).getSchemaGenerator();
    await generator.refreshDatabase();
    await generator.clearDatabase();

    await keyStorageService.save(keysWithModuleAddress);
    await operatorStorageService.save(operatorsWithModuleAddress);
  });

  afterEach(async () => {
    await clearDb(mikroOrm);
    await registryStorageService.onModuleDestroy();
  });

  test('no update is required when nothing changed', async () => {
    // fixture: finalizedUsedSigningKeys == totalSigningKeys == 3
    // range [3, 3) is empty → saveKeys not called
    const saveOperatorsRegistryMock = jest.spyOn(registryService, 'saveOperators');
    const saveKeyRegistryMock = jest.spyOn(registryService, 'saveKeys');

    registryServiceMock(moduleRef, {
      keys: keysWithModuleAddress,
      operators: operatorsWithModuleAddress,
    });

    await registryService.update(address, blockHash);
    expect(saveOperatorsRegistryMock).toBeCalledTimes(1);
    expect(saveKeyRegistryMock).toBeCalledTimes(0);
    await compareTestKeysAndOperators(address, registryService, {
      keys: keysWithModuleAddress,
      operators: operatorsWithModuleAddress,
    });
  });

  test('new key is added to database if totalSigningKeys is increased', async () => {
    // totalSigningKeys 3→4 for operator 0
    // range [3, 4) → one new key fetched and saved
    const newKeys = clone([...keysWithModuleAddress, { ...newKey, moduleAddress: address, vetted: true }]);

    const newOperators = clone(operatorsWithModuleAddress);
    newOperators[0].totalSigningKeys++;

    const saveKeyRegistryMock = jest.spyOn(registryService, 'saveKeys');

    registryServiceMock(moduleRef, {
      keys: newKeys,
      operators: newOperators,
    });

    await registryService.update(address, blockHash);
    expect(saveKeyRegistryMock.mock.calls.length).toBeGreaterThanOrEqual(1);

    await compareTestKeys(address, registryService, { keys: newKeys });
    await compareTestOperators(address, registryService, {
      operators: newOperators,
    });
  });

  test('remove keys with index higher than totalSigningKeys', async () => {
    // totalSigningKeys 3→2 for operator 0
    // saveOperators() runs nativeDelete({ index: { $gte: 2 } }) → key at index 2 deleted
    const newOperators = clone(operatorsWithModuleAddress);
    newOperators[0].totalSigningKeys--;

    registryServiceMock(moduleRef, {
      keys: keysWithModuleAddress,
      operators: newOperators,
    });

    await registryService.update(address, blockHash);

    await compareTestOperators(address, registryService, {
      operators: newOperators,
    });

    const newOperator0Keys = keysWithModuleAddress
      .filter(({ operatorIndex }) => operatorIndex === 0)
      .sort((a, b) => a.operatorIndex - b.operatorIndex)
      .slice(0, -1);

    const oldOperators1Keys = keysWithModuleAddress
      .filter(({ operatorIndex }) => operatorIndex === 1)
      .sort((a, b) => a.operatorIndex - b.operatorIndex);

    await compareTestKeys(address, registryService, {
      keys: [...newOperator0Keys, ...oldOperators1Keys],
    });

    const keysOfOperator0 = (await registryService.getModuleKeysFromStorage(address)).filter(
      ({ operatorIndex }) => operatorIndex === 0,
    );

    expect(keysOfOperator0.length).toBe(newOperators[0].totalSigningKeys);
  });
});

describe('Reorg detection', () => {
  const loggerWarn = jest.fn();

  let registryService: KeyRegistryService;
  let registryStorageService: RegistryStorageService;
  let keyStorageService: RegistryKeyStorageService;
  let operatorStorageService: RegistryOperatorStorageService;
  let moduleRef: TestingModule;
  let mikroOrm: MikroORM;

  beforeEach(async () => {
    loggerWarn.mockClear();
    const imports = [
      MockContractsModule,
      DatabaseE2ETestingModule.forRoot(),
      MockLoggerModule.forRoot({
        log: jest.fn(),
        error: jest.fn(),
        warn: loggerWarn,
      }),
      KeyRegistryModule.forFeature(),
      PrometheusModule,
    ];
    moduleRef = await Test.createTestingModule({
      imports,
      providers: [{ provide: LOGGER_PROVIDER, useValue: {} }],
    }).compile();
    registryService = moduleRef.get(KeyRegistryService);
    registryStorageService = moduleRef.get(RegistryStorageService);
    keyStorageService = moduleRef.get(RegistryKeyStorageService);
    operatorStorageService = moduleRef.get(RegistryOperatorStorageService);
    mikroOrm = moduleRef.get(MikroORM);
    const generator = mikroOrm.getSchemaGenerator();
    await generator.refreshDatabase();
    await generator.clearDatabase();
  });

  afterEach(async () => {
    await clearDb(mikroOrm);
    await registryStorageService.onModuleDestroy();
  });

  test('keys below finalizedUsedSigningKeys are not overwritten on second update', async () => {
    // 1st update: empty DB → compareOperators(null, op) = false → unchangedKeysMaxIndex = 0
    // all keys [0, 3) fetched for each operator
    const saveKeyRegistryMock = jest.spyOn(registryService, 'saveKeys');
    const finalizedUsedSigningKeys = 1;

    const keysWithModuleAddress = keys.map((key) => {
      return { ...key, moduleAddress: address };
    });

    const operatorsWithModuleAddress = operators.map((key) => {
      return { ...key, moduleAddress: address, finalizedUsedSigningKeys };
    });

    const unrefMock = registryServiceMock(moduleRef, {
      keys: keysWithModuleAddress,
      operators: operatorsWithModuleAddress,
    });

    await registryService.update(address, blockHash);

    expect(saveKeyRegistryMock.mock.calls.length).toEqual(operatorsWithModuleAddress.length);

    await compareTestKeysAndOperators(address, registryService, {
      keys: keysWithModuleAddress,
      operators: operatorsWithModuleAddress,
    });

    unrefMock();

    // 2nd update: mock returns corrupted keys for index < finalizedUsedSigningKeys
    // but update() uses range [finalizedUsedSigningKeys, totalSigningKeys) = [1, 3)
    // so keys at index 0 are NOT re-fetched → DB retains correct data
    const keysWithSpoiledLeftEdge = clone(keysWithModuleAddress).map((key) =>
      key.index >= finalizedUsedSigningKeys ? { ...key } : { ...key, key: '', depositSignature: '' },
    );

    registryServiceMock(moduleRef, {
      keys: keysWithSpoiledLeftEdge,
      operators: operatorsWithModuleAddress,
    });

    await registryService.update(address, blockHash);

    await compareTestKeysAndOperators(address, registryService, {
      keys: keysWithModuleAddress,
      operators: operatorsWithModuleAddress,
    });
  });

  test('a used=false key below the pointer forces a full re-read that repairs it', async () => {
    // pointer sits past every key of the operator
    const finalizedUsedSigningKeys = 3;

    const operatorsWithModuleAddress = operators.map((operator) => {
      return { ...operator, moduleAddress: address, finalizedUsedSigningKeys };
    });

    // seed the DB as an affected version would leave it: operator 0's key at index 1 is
    // deposited on-chain but frozen with used=false below the sync pointer
    const poisonedKeys = keys.map((key) => {
      return { ...key, moduleAddress: address };
    });
    const frozenKey = poisonedKeys.find(({ operatorIndex, index }) => operatorIndex === 0 && index === 1);
    if (!frozenKey) throw new Error('fixture changed: operator 0 key at index 1 is missing');
    frozenKey.used = false;

    await operatorStorageService.save(operatorsWithModuleAddress);
    await keyStorageService.save(poisonedKeys);

    // the contract returns the correct picture — every key below the pointer is used
    const correctKeys = keys.map((key) => {
      return { ...key, moduleAddress: address };
    });

    registryServiceMock(moduleRef, {
      keys: correctKeys,
      operators: operatorsWithModuleAddress,
    });

    await registryService.update(address, blockHash);

    // exactly one invariant warning, and it names the poisoned operator 0 — the healthy operator 1
    // (every key used up to its pointer) never trips the guard
    const invariantWarnings = loggerWarn.mock.calls.filter(
      ([message]) => message === 'Sync pointer invariant is broken, re-reading all operator keys',
    );
    expect(invariantWarnings).toHaveLength(1);
    expect(invariantWarnings[0][1]).toMatchObject({ operatorIndex: 0, usedKeysCount: 2, maxUsedKeyIndex: 2 });

    // operator 0 was re-read from index 0 (full repair); operator 1 kept its incremental read
    const keyFetchCalls = (
      moduleRef.get(RegistryKeyBatchFetchService).fetchSigningKeysInBatches as jest.Mock
    ).mock.calls.map(([, operatorIndex, , fromIndex]) => ({ operatorIndex, fromIndex }));
    expect(keyFetchCalls).toContainEqual({ operatorIndex: 0, fromIndex: 0 });
    expect(keyFetchCalls).not.toContainEqual({ operatorIndex: 1, fromIndex: 0 });

    // ...so the frozen key is repaired and the DB matches the contract
    await compareTestKeysAndOperators(address, registryService, {
      keys: correctKeys,
      operators: operatorsWithModuleAddress,
    });
  });

  test('unused keys at or above the pointer do not force a full re-read from index 0', async () => {
    // the everyday state of an operator: keys below the pointer are deposited (used), while
    // vetted-but-not-yet-deposited keys sit at or above the pointer with used=false
    const finalizedUsedSigningKeys = 2;

    const operatorsWithModuleAddress = operators.map((operator) => {
      return { ...operator, moduleAddress: address, finalizedUsedSigningKeys };
    });

    // key at index 2 (== pointer) is vetted but not deposited yet — a legitimate used=false
    const healthyKeys = keys.map((key) => {
      return key.index >= finalizedUsedSigningKeys
        ? { ...key, moduleAddress: address, used: false }
        : { ...key, moduleAddress: address };
    });

    await operatorStorageService.save(operatorsWithModuleAddress);
    await keyStorageService.save(healthyKeys);

    // the contract agrees — those keys are still not deposited
    registryServiceMock(moduleRef, {
      keys: healthyKeys,
      operators: operatorsWithModuleAddress,
    });

    await registryService.update(address, blockHash);

    // an unused key at or above the pointer is normal, so the guard must stay silent
    expect(loggerWarn).not.toHaveBeenCalledWith(
      'Sync pointer invariant is broken, re-reading all operator keys',
      expect.anything(),
    );

    // ...and the database is left exactly as it was
    await compareTestKeysAndOperators(address, registryService, {
      keys: healthyKeys,
      operators: operatorsWithModuleAddress,
    });
  });

  test('a missing deposited key below the pointer forces a full re-read that recreates it', async () => {
    // operator 0 is poisoned, operator 1 is healthy — both on-chain have 5 deposited keys, all used
    const finalizedUsedSigningKeys = 5;
    const operatorsWithModuleAddress = [0, 1].map((index) => ({
      ...operators[index],
      moduleAddress: address,
      totalSigningKeys: 5,
      usedSigningKeys: 5,
      finalizedUsedSigningKeys,
    }));

    const buildKey = (operatorIndex: number, index: number) => ({
      operatorIndex,
      index,
      key: keys[0].key,
      depositSignature: keys[0].depositSignature,
      used: true,
      vetted: true,
      moduleAddress: address,
    });

    // seed the DB as an affected version left it: for operator 0 the pointer is 5, but only keys [0, 2)
    // were ever fetched — indices [2, 5) are ABSENT (a hole below the pointer), not merely used=false.
    // operator 1 is intact: all five keys are present and used, so its prefix reaches the pointer.
    const legacyKeys = [buildKey(0, 0), buildKey(0, 1), ...[0, 1, 2, 3, 4].map((i) => buildKey(1, i))];
    const contractKeys = [0, 1].flatMap((op) => [0, 1, 2, 3, 4].map((i) => buildKey(op, i)));

    await operatorStorageService.save(operatorsWithModuleAddress);
    await keyStorageService.save(legacyKeys);

    registryServiceMock(moduleRef, {
      keys: contractKeys,
      operators: operatorsWithModuleAddress,
    });

    await registryService.update(address, blockHash);

    // exactly one invariant warning: operator 0's used prefix (2 keys, up to index 1) does not reach
    // its pointer (5). The healthy operator 1 never trips the guard.
    const invariantWarnings = loggerWarn.mock.calls.filter(
      ([message]) => message === 'Sync pointer invariant is broken, re-reading all operator keys',
    );
    expect(invariantWarnings).toHaveLength(1);
    expect(invariantWarnings[0][1]).toMatchObject({ operatorIndex: 0, usedKeysCount: 2, maxUsedKeyIndex: 1 });

    // operator 0 was re-read from index 0 (recreating the hole); operator 1 kept its incremental read
    const keyFetchCalls = (
      moduleRef.get(RegistryKeyBatchFetchService).fetchSigningKeysInBatches as jest.Mock
    ).mock.calls.map(([, operatorIndex, , fromIndex]) => ({ operatorIndex, fromIndex }));
    expect(keyFetchCalls).toContainEqual({ operatorIndex: 0, fromIndex: 0 });
    expect(keyFetchCalls).not.toContainEqual({ operatorIndex: 1, fromIndex: 0 });

    // ...and the absent keys [2, 5) are re-read from the contract and stored as used
    const storedIndexes = (await keyStorageService.findAll(address))
      .filter(({ operatorIndex }) => operatorIndex === 0)
      .map(({ index }) => index)
      .sort((a, b) => a - b);
    expect(storedIndexes).toEqual([0, 1, 2, 3, 4]);
    expect((await keyStorageService.findUsed(address)).filter(({ operatorIndex }) => operatorIndex === 0).length).toBe(
      5,
    );
  });
});

/**
 * Test mocks results of getNodeOperator, getNodeOperatorSummary, getSigningKeys methods
 * Modeling case than finalizied deposited value  > anchored value, but checks prevent wrong values in db
 */
describe('Finalized pointer race (contract-driven, real DB)', () => {
  // A single operator with 40 keys. The deposit of key #19 happens at DEPOSIT_BLOCK, so a query
  // before it sees 19 deposited and a query at/after it sees 20 — this step is the whole race.
  const ANCHOR_BLOCK = 25605204;
  const DEPOSIT_BLOCK = 25605205;
  const AFTER_FINALIZATION_BLOCK = 25605269; // at this block finalized value > deposited value will be read
  const DEPOSITED_AT_ANCHOR = 19;
  const DEPOSITED_AT_FINALIZED = 20;
  const VICTIM_INDEX = 19; // key index that will change status at finalized block
  const TOTAL_ADDED = 40;
  const REWARD = '0x' + '42'.repeat(20);

  // The mock encodes the queried block number into the "block hash" so it can answer per block.
  const hashOf = (block: number) => '0x' + block.toString(16).padStart(64, '0');
  const blockOfHash = (hash: string) => parseInt(hash, 16);
  const depositedAmountAt = (block: number) => (block >= DEPOSIT_BLOCK ? DEPOSITED_AT_FINALIZED : DEPOSITED_AT_ANCHOR);

  const provider = new JsonRpcBatchProvider(process.env.PROVIDERS_URLS);
  jest.spyOn(provider, 'detectNetwork').mockImplementation(async () => getNetwork('mainnet'));

  const iface = new Interface(Registry__factory.abi);
  const SEL_COUNT = iface.getSighash('getNodeOperatorsCount');
  const SEL_OPERATOR = iface.getSighash('getNodeOperator');
  const SEL_SUMMARY = iface.getSighash('getNodeOperatorSummary');
  const SEL_KEYS = iface.getSighash('getSigningKeys');

  const encodeOperator = (deposited: number) =>
    iface.encodeFunctionResult(
      'getNodeOperator',
      operatorFields({
        active: true,
        name: 'operator',
        rewardAddress: REWARD,
        stakingLimit: TOTAL_ADDED, // totalVettedValidators
        stoppedValidators: 0, // totalExitedValidators
        totalSigningKeys: TOTAL_ADDED, // totalAddedValidators
        usedSigningKeys: deposited, // totalDepositedValidators — the block-dependent value
      }),
    );

  const encodeSummary = (deposited: number) =>
    iface.encodeFunctionResult(
      'getNodeOperatorSummary',
      operatorSummaryFields({ ...operatorSummary, totalDepositedValidators: deposited, depositableValidatorsCount: 0 }),
    );

  // getSigningKeys returns [keys, signatures, used[]]; `used` is the contract's own flag, read at
  // the anchor block, so it too depends on how many were deposited there.
  const encodeKeys = (from: number, count: number, deposited: number) => {
    let keys = '0x';
    let sigs = '0x';
    const used: boolean[] = [];
    for (let i = from; i < from + count; i++) {
      keys += i.toString(16).padStart(96, 'a');
      sigs += '0'.repeat(192);
      used.push(i < deposited);
    }
    return iface.encodeFunctionResult('getSigningKeys', [keys, sigs, used]);
  };

  // What the floating `finalized` tag resolves to "right now". Kept past the deposit for both
  // cycles, so `finalized` is always ahead of an anchor that has not yet caught up.
  let finalizedBlock = AFTER_FINALIZATION_BLOCK;

  const respond = async (tx: any, blockTag?: any): Promise<string> => {
    const data: string = await tx.data;
    const selector = data.slice(0, 10);
    const block =
      blockTag === 'finalized'
        ? finalizedBlock
        : typeof blockTag === 'object' && blockTag?.blockHash
        ? blockOfHash(blockTag.blockHash)
        : ANCHOR_BLOCK;
    const deposited = depositedAmountAt(block);

    if (selector === SEL_COUNT) return iface.encodeFunctionResult('getNodeOperatorsCount', [1]);
    if (selector === SEL_OPERATOR) return encodeOperator(deposited);
    if (selector === SEL_SUMMARY) return encodeSummary(deposited);
    if (selector === SEL_KEYS) {
      const [, offset, limit] = iface.decodeFunctionData('getSigningKeys', data);
      return encodeKeys(Number(offset), Number(limit), deposited);
    }
    throw new Error(`unexpected selector ${selector}`);
  };

  const mockCall = jest.spyOn(provider, 'call').mockImplementation(respond);
  const connectRegistry = (addr: string) => Registry__factory.connect(addr, provider);

  @Global()
  @Module({
    providers: [{ provide: REGISTRY_CONTRACT_TOKEN, useValue: connectRegistry }],
    exports: [REGISTRY_CONTRACT_TOKEN],
  })
  class RpcMockContractsModule {}

  const loggerWarn = jest.fn();
  const invariantBroken = 'Sync pointer invariant is broken, re-reading all operator keys';

  let registryService: KeyRegistryService;
  let registryStorageService: RegistryStorageService;
  let keyStorageService: RegistryKeyStorageService;
  let mikroOrm: MikroORM;

  beforeEach(async () => {
    finalizedBlock = AFTER_FINALIZATION_BLOCK;
    loggerWarn.mockClear();
    mockCall.mockImplementation(respond);

    const imports = [
      RpcMockContractsModule,
      DatabaseE2ETestingModule.forRoot(),
      MockLoggerModule.forRoot({ log: jest.fn(), error: jest.fn(), warn: loggerWarn }),
      KeyRegistryModule.forFeature(),
      PrometheusModule,
    ];
    const moduleRef = await Test.createTestingModule({ imports }).compile();
    registryService = moduleRef.get(KeyRegistryService);
    registryStorageService = moduleRef.get(RegistryStorageService);
    keyStorageService = moduleRef.get(RegistryKeyStorageService);
    mikroOrm = moduleRef.get(MikroORM);
    const generator = mikroOrm.getSchemaGenerator();
    await generator.refreshDatabase();
    await generator.clearDatabase();
  });

  afterEach(async () => {
    mockCall.mockClear();
    await clearDb(mikroOrm);
    await registryStorageService.onModuleDestroy();
  });

  test('clamp keeps the used-key set complete across a delayed iteration', async () => {
    // ── cycle N: the anchor is older than finality; `finalized` already includes deposit #19 ──
    await registryService.update(address, hashOf(ANCHOR_BLOCK));
    // In production every cycle runs inside @UseRequestContext(), so each starts with a fresh EM
    // (empty identity map). Here a single global EM spans the whole test, and saveKeys upserts
    // natively (bypassing the identity map), so cached rows would go stale. Clear it to read from DB.
    mikroOrm.em.clear();

    const [operatorAfterN] = await registryService.getOperatorsFromStorage(address);
    // the pointer read at `finalized` was 20, but the clamp pinned it to the anchor's 19
    expect(operatorAfterN.finalizedUsedSigningKeys).toBe(DEPOSITED_AT_ANCHOR);
    expect(operatorAfterN.finalizedUsedSigningKeys).toBeLessThanOrEqual(VICTIM_INDEX);

    // key #19 is not deposited at the anchor, so it is stored used=false — which is safe here,
    // because the clamped pointer keeps it inside the re-read range instead of freezing it below
    const victimAfterN = await keyStorageService.findOneByIndex(address, 0, VICTIM_INDEX);
    expect(victimAfterN?.used).toBe(false);

    // the clamp alone kept the invariant intact, so the guard never had to fire
    expect(loggerWarn).not.toHaveBeenCalledWith(invariantBroken, expect.anything());

    // ── cycle N+1: the anchor has advanced past the deposit ──
    await registryService.update(address, hashOf(AFTER_FINALIZATION_BLOCK));
    mikroOrm.em.clear(); // new cycle = fresh context in prod; drop the identity map so reads hit the DB

    // key #19 was re-read (it was never frozen) and is now marked used
    const victimAfterNext = await keyStorageService.findOneByIndex(address, 0, VICTIM_INDEX);
    expect(victimAfterNext?.used).toBe(true);

    const usedKeys = await keyStorageService.findUsed(address);
    expect(usedKeys.length).toBe(DEPOSITED_AT_FINALIZED);
    expect(usedKeys.map((key) => key.index)).toContain(VICTIM_INDEX);

    // still no guard involvement across the whole run — the clamp handled the race on its own
    expect(loggerWarn).not.toHaveBeenCalledWith(invariantBroken, expect.anything());
  });
});
