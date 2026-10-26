import { Migration } from '@mikro-orm/migrations';

/**
 * One-time repair for databases written by an affected version (<= 4.0.1).
 *
 * The finalized-pointer race could store a per-operator sync pointer (finalized_used_signing_keys)
 * one ahead of the block's deposited count, freezing one deposited key as used=false below the
 * pointer. The incremental sync never re-reads keys below the pointer, and when a module's nonce is
 * unchanged with no reorg/operator event the updater takes the "No changes" fast path and does not
 * refetch at all — so an invalid row can persist indefinitely.
 *
 * We wipe all registry data (same reset the codebase already uses for schema changes) so the next
 * sync rebuilds every module from block 0. Before wiping, we log any operator whose stored used-key
 * set violates the used-prefix invariant, to leave a record of what was actually corrupted.
 */
export class Migration20260729131720 extends Migration {
  async up(): Promise<void> {
    // Report every operator whose stored used-keys are not a gap-free prefix reaching the pointer,
    // and pinpoint first_broken_index — the lowest index below the pointer that is not present-and-used
    // (a used=false hole, a missing row, or a missing index 0). Healthy operators have that index at
    // or above the pointer and are excluded. Ordering used keys by index and comparing to their rank
    // (idx <> rn) locates the first hole; with no hole the first missing index is max_used + 1.
    const result: any = await this.execute(`
      WITH used AS (
        SELECT module_address, operator_index, "index" AS idx,
               ROW_NUMBER() OVER (PARTITION BY module_address, operator_index ORDER BY "index") - 1 AS rn
        FROM registry_key
        WHERE used = true
      ),
      stats AS (
        SELECT module_address, operator_index,
               COUNT(*)                        AS used_count,
               MAX(idx)                        AS max_used,
               MIN(idx) FILTER (WHERE idx <> rn) AS first_misplaced
        FROM used
        GROUP BY module_address, operator_index
      )
      SELECT
        o.module_address,
        o.index                                                           AS operator_index,
        o.finalized_used_signing_keys                                     AS cursor,
        COALESCE(s.used_count, 0)                                         AS used_count,
        COALESCE(s.max_used, -1)                                          AS max_used,
        COALESCE(s.first_misplaced - 1, COALESCE(s.max_used, -1) + 1)     AS first_broken_index
      FROM registry_operator o
      LEFT JOIN stats s ON s.module_address = o.module_address AND s.operator_index = o.index
      WHERE o.finalized_used_signing_keys > 0
        AND COALESCE(s.first_misplaced - 1, COALESCE(s.max_used, -1) + 1) < o.finalized_used_signing_keys
      ORDER BY o.module_address, operator_index
    `);

    // some drivers return the rows array directly, others wrap them in { rows }
    const broken: any[] = Array.isArray(result) ? result : result?.rows ?? [];

    if (broken.length === 0) {
      // eslint-disable-next-line no-console
      console.log('[keys-race-repair] No operators violate the used-prefix invariant before wipe.');
    } else {
      // eslint-disable-next-line no-console
      console.warn(
        `[keys-race-repair] ${broken.length} operator(s) violate the used-prefix invariant, wiping to rebuild:`,
        JSON.stringify(broken),
      );
    }

    this.addSql('TRUNCATE registry_key');
    this.addSql('TRUNCATE registry_operator');
    this.addSql('TRUNCATE el_meta_entity');
    this.addSql('TRUNCATE sr_module_entity');
  }

  async down(): Promise<void> {
    this.addSql('TRUNCATE registry_key');
    this.addSql('TRUNCATE registry_operator');
    this.addSql('TRUNCATE el_meta_entity');
    this.addSql('TRUNCATE sr_module_entity');
  }
}
