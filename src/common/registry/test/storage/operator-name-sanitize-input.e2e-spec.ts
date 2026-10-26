import { Test } from '@nestjs/testing';
import { MikroORM } from '@mikro-orm/core';
import { operator } from '../fixtures/operator.fixture';
import { RegistryStorageModule, RegistryStorageService, RegistryOperatorStorageService } from '../..';
import { DatabaseE2ETestingModule } from 'app';
import * as dotenv from 'dotenv';

dotenv.config();

// Hardcoded lowercased module address — this test exercises only the DB write path,
// so it needs no on-chain lookup (unlike the other operator.storage e2e specs).
const MODULE_ADDRESS = '0x' + 'a'.repeat(40);

const NUL = String.fromCharCode(0); // Postgres text/varchar can't store a NUL byte
const SOH = String.fromCharCode(1); // a C0 control char other than NUL

describe('Invalid operator name', () => {
  let storageService: RegistryOperatorStorageService;
  let registryService: RegistryStorageService;
  let orm: MikroORM;

  const buildOperator = (index: number, name: string) => ({
    index,
    moduleAddress: MODULE_ADDRESS,
    ...operator,
    name,
  });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [DatabaseE2ETestingModule.forRoot(), RegistryStorageModule.forFeature()],
    }).compile();

    storageService = moduleRef.get(RegistryOperatorStorageService);
    registryService = moduleRef.get(RegistryStorageService);
    orm = moduleRef.get(MikroORM);

    const generator = orm.getSchemaGenerator();
    await generator.refreshDatabase();
    await generator.clearDatabase();
  });

  afterEach(async () => {
    await registryService.onModuleDestroy();
  });

  test('control: a clean name is stored and read back', async () => {
    const op = buildOperator(1, 'clean-name');
    await storageService.saveOne(op);
    await expect(storageService.findAll(MODULE_ADDRESS)).resolves.toEqual([op]);
  });

  test('a NUL byte in the name is rejected by Postgres', async () => {
    const op = buildOperator(2, `A${NUL}B`);
    // Postgres text/varchar can't store a NUL byte, so the insert is rejected (pg reports it as
    // "invalid message format"). This is why the name is validated before it reaches the DB.
    await expect(storageService.saveOne(op)).rejects.toThrow(/invalid message format|null/i);
  });

  test('a C0 control char (0x01) is accepted by Postgres', async () => {
    // Other control bytes store fine — only NUL needs replacing, so we don't strip control
    // characters in general.
    const op = buildOperator(3, `A${SOH}B`);
    await storageService.saveOne(op);
    const saved = await storageService.findAll(MODULE_ADDRESS);
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe(`A${SOH}B`);
  });

  test('NUL is the only valid-UTF-8 char that Postgres rejects', async () => {
    // ethers only yields valid UTF-8, and Postgres stores all of it except U+0000 — this is why
    // the name check only needs to look for NUL.
    const accepted: Array<[string, string]> = [
      ['DEL U+007F', String.fromCharCode(0x7f)],
      ['C1 control U+0085', String.fromCharCode(0x85)],
      ['replacement U+FFFD', String.fromCharCode(0xfffd)],
      ['multibyte U+03A9', String.fromCharCode(0x03a9)],
      ['emoji U+1F600', String.fromCodePoint(0x1f600)],
      ['lone surrogate U+D800', String.fromCharCode(0xd800)],
    ];

    let index = 10;
    for (const [, ch] of accepted) {
      await expect(storageService.saveOne(buildOperator(index++, `A${ch}B`))).resolves.not.toThrow();
    }

    // ...and NUL is the one that fails
    await expect(storageService.saveOne(buildOperator(index, `A${NUL}B`))).rejects.toThrow();
  });
});
