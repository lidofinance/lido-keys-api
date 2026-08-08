import { Test } from '@nestjs/testing';
import { MikroORM } from '@mikro-orm/core';
import { operator } from '../fixtures/operator.fixture';
import { RegistryStorageModule, RegistryStorageService, RegistryOperatorStorageService } from '../../';
import { DatabaseE2ETestingModule } from 'app';
import * as dotenv from 'dotenv';

dotenv.config();

// Hardcoded lowercased module address — this test exercises only the DB write path,
// so it needs no on-chain lookup (unlike the other operator.storage e2e specs).
const MODULE_ADDRESS = '0x' + 'a'.repeat(40);

const NUL = String.fromCharCode(0); // the byte Postgres cannot store
const SOH = String.fromCharCode(1); // a C0 control char that is NOT NUL

/**
 * Bug 87712 - Layer B: a curated-v2 operator name is validated on chain for length only.
 * A NUL byte is valid UTF-8, so it survives the resolver and reaches the Postgres INSERT,
 * where it breaks the wire protocol (the NUL terminates the C string carrying the statement).
 * These tests prove, against a real Postgres, exactly which byte content the operator write
 * path can and cannot store.
 */
describe('Operator name poison - Postgres write path (bug 87712)', () => {
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

  test('NUL byte in name breaks the Postgres INSERT', async () => {
    const op = buildOperator(2, `A${NUL}B`);
    // Postgres text/varchar cannot carry a NUL byte; the driver rejects the whole statement.
    // On the real ORM path this surfaces as the wire-protocol error "invalid message format".
    await expect(storageService.saveOne(op)).rejects.toThrow(/invalid message format|null/i);
  });

  test('characterization: a C0 control char (0x01) IS accepted by Postgres', async () => {
    // Only NUL breaks the wire protocol; other control bytes are storable. This tells us the
    // mandatory sanitizer target is the NUL byte, and that stripping other control chars is a choice.
    const op = buildOperator(3, `A${SOH}B`);
    await storageService.saveOne(op);
    const saved = await storageService.findAll(MODULE_ADDRESS);
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe(`A${SOH}B`);
  });

  test('characterization: NUL is the ONLY valid-UTF-8 char that Postgres rejects', async () => {
    // Everything ethers lets through is valid UTF-8. Among valid UTF-8, only U+0000 breaks the
    // INSERT — every other "suspicious" codepoint stores fine. This bounds the sanitizer to NUL.
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
