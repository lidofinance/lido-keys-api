import { Migration } from '@mikro-orm/migrations';

export class Migration20230727104520 extends Migration {
  async up(): Promise<void> {
    // TODO: what this two rows mean
    this.addSql('alter table "registry_operator" alter column "index" type int using ("index"::int);');
    this.addSql(
      'alter table "registry_operator" alter column "module_address" type varchar(255) using ("module_address"::varchar(255));',
    );
    this.addSql('alter table "registry_operator" drop constraint "registry_operator_pkey";');
    this.addSql('alter table "registry_operator" alter column "index" drop default;');
    this.addSql(
      'alter table "registry_operator" add constraint "registry_operator_pkey" primary key ("index", "module_address");',
    );
  }

  async down(): Promise<void> {
    this.addSql('alter table "registry_operator" alter column "index" type int4 using ("index"::int4);');
    this.addSql(
      'alter table "registry_operator" alter column "module_address" type varchar using ("module_address"::varchar);',
    );
    this.addSql('alter table "registry_operator" drop constraint "registry_operator_pkey";');
    this.addSql('create sequence if not exists "registry_operator_index_seq";');
    this.addSql('select setval(\'registry_operator_index_seq\', (select max("index") from "registry_operator"));');
    this.addSql(
      'alter table "registry_operator" alter column "index" set default nextval(\'registry_operator_index_seq\');',
    );
    this.addSql('alter table "registry_operator" add constraint "registry_operator_pkey" primary key ("index");');
  }
}
