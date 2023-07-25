import { Migration } from '@mikro-orm/migrations';

export class Migration20230724202500 extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table "registry_operator" add column "module_address" varchar(42) null;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "registry_operator" drop column "module_address";');
  }
}
