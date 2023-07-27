import { Migration } from '@mikro-orm/migrations';

export class Migration20230727105014 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'alter table "registry_key" alter column "module_address" type varchar(255) using ("module_address"::varchar(255));',
    );
    this.addSql('alter table "registry_key" drop constraint "registry_key_pkey";');
    this.addSql(
      'alter table "registry_key" add constraint "registry_key_pkey" primary key ("index", "operator_index", "module_address");',
    );
  }

  async down(): Promise<void> {
    this.addSql(
      'alter table "registry_key" alter column "module_address" type varchar using ("module_address"::varchar);',
    );
    this.addSql('alter table "registry_key" drop constraint "registry_key_pkey";');
    this.addSql(
      'alter table "registry_key" add constraint "registry_key_pkey" primary key ("index", "operator_index");',
    );
  }
}
