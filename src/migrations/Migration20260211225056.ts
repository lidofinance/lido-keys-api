import { Migration } from '@mikro-orm/migrations';

export class Migration20260211225056 extends Migration {
  async up(): Promise<void> {
    this.addSql('TRUNCATE sr_module_entity');
    this.addSql('alter table "sr_module_entity" add column "withdrawal_credentials_type" int not null;');
  }

  async down(): Promise<void> {
    this.addSql('TRUNCATE sr_module_entity');
    this.addSql('alter table "sr_module_entity" drop column "withdrawal_credentials_type";');
  }
}
