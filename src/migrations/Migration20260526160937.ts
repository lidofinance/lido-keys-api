import { Migration } from '@mikro-orm/migrations';

export class Migration20260526160937 extends Migration {
  async up(): Promise<void> {
    this.addSql('TRUNCATE registry_key');
    this.addSql('TRUNCATE registry_operator');
    this.addSql('TRUNCATE el_meta_entity');
    this.addSql('TRUNCATE sr_module_entity');
    this.addSql('alter table "registry_operator" add column "depositable_validators_count" int not null;');
  }

  async down(): Promise<void> {
    this.addSql('TRUNCATE registry_key');
    this.addSql('TRUNCATE registry_operator');
    this.addSql('TRUNCATE el_meta_entity');
    this.addSql('TRUNCATE sr_module_entity');
    this.addSql('alter table "registry_operator" drop column "depositable_validators_count";');
  }
}
