import { Migration } from '@mikro-orm/migrations';

export class Migration20230721174651 extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table "el_meta_entity" alter column "block_number" type int using ("block_number"::int);');
    this.addSql(
      'alter table "el_meta_entity" alter column "block_hash" type varchar(255) using ("block_hash"::varchar(255));',
    );
    this.addSql('alter table "el_meta_entity" drop constraint "el_meta_entity_pkey";');
    this.addSql('alter table "el_meta_entity" alter column "block_number" drop default;');
    this.addSql(
      'alter table "el_meta_entity" add constraint "el_meta_entity_pkey" primary key ("block_number", "block_hash");',
    );
  }

  async down(): Promise<void> {
    this.addSql('alter table "el_meta_entity" alter column "block_number" type int4 using ("block_number"::int4);');
    this.addSql('alter table "el_meta_entity" alter column "block_hash" type varchar using ("block_hash"::varchar);');
    this.addSql('alter table "el_meta_entity" drop constraint "el_meta_entity_pkey";');
    this.addSql('create sequence if not exists "el_meta_entity_block_number_seq";');
    this.addSql(
      'select setval(\'el_meta_entity_block_number_seq\', (select max("block_number") from "el_meta_entity"));',
    );
    this.addSql(
      'alter table "el_meta_entity" alter column "block_number" set default nextval(\'el_meta_entity_block_number_seq\');',
    );
    this.addSql('alter table "el_meta_entity" add constraint "el_meta_entity_pkey" primary key ("block_number");');
  }
}
