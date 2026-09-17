import { Migration } from '@mikro-orm/migrations';

export class Migration20260917083520 extends Migration {

  async up(): Promise<void> {
    // totalWithdrawnKeys has no on-chain-independent backfill (it comes from the community/CSM
    // contract), so we clear all synced data and let the single keys-update writer rebuild everything
    // from block 0 on first sync. This gives 0x02 operators real values before the service starts
    // serving (it returns 425 until the first sync completes) instead of relying on deploy timing.
    // The column is nullable: legacy (0x01) operators stay NULL (a distinct "not applicable" marker,
    // never confused with a real 0), while 0x02 operators get a real value.
    this.addSql('TRUNCATE registry_key');
    this.addSql('TRUNCATE registry_operator');
    this.addSql('TRUNCATE el_meta_entity');
    this.addSql('TRUNCATE sr_module_entity');
    this.addSql('alter table "registry_operator" add column "total_withdrawn_keys" int null;');
  }

  async down(): Promise<void> {
    // Symmetric to up(): clear synced data so a rollback also rebuilds from block 0.
    this.addSql('TRUNCATE registry_key');
    this.addSql('TRUNCATE registry_operator');
    this.addSql('TRUNCATE el_meta_entity');
    this.addSql('TRUNCATE sr_module_entity');
    this.addSql('alter table "registry_operator" drop column "total_withdrawn_keys";');
  }
}
