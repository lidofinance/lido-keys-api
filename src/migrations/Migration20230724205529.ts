import { Migration } from '@mikro-orm/migrations';

export class Migration20230724205529 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'alter table "registry_operator" alter column "module_address" type varchar(42) using ("module_address"::varchar(42));',
    );
    this.addSql('alter table "registry_operator" alter column "module_address" set not null;');
  }

  async down(): Promise<void> {
    this.addSql(
      'alter table "registry_operator" alter column "module_address" type varchar using ("module_address"::varchar);',
    );
    this.addSql('alter table "registry_operator" alter column "module_address" drop not null;');
  }
}
