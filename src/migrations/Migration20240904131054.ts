import { Migration } from '@mikro-orm/migrations';

export class Migration20240904131054 extends Migration {
  async up(): Promise<void> {
    this.addSql('TRUNCATE registry_key');
    this.addSql('TRUNCATE registry_operator');
    this.addSql('TRUNCATE el_meta_entity');
    this.addSql('TRUNCATE sr_module_entity');

    this.addSql('alter table "registry_key" add column "vetted" boolean not null;');
  }

  async down(): Promise<void> {
    this.addSql('TRUNCATE registry_key');
    this.addSql('TRUNCATE registry_operator');
    this.addSql('TRUNCATE el_meta_entity');
    this.addSql('TRUNCATE sr_module_entity');

    this.addSql('alter table "registry_key" drop column "vetted";');
  }
}
