import { Migration } from '@mikro-orm/migrations';

export class Migration20230903183749 extends Migration {
  async up(): Promise<void> {
    this.addSql('TRUNCATE registry_key');
    this.addSql('TRUNCATE registry_operator');
    this.addSql('TRUNCATE registry_meta');

    this.addSql(
      'create table "el_meta_entity" ("block_number" int not null, "block_hash" varchar(255) not null, "timestamp" int not null, constraint "el_meta_entity_pkey" primary key ("block_number", "block_hash"));',
    );

    this.addSql(
      'create table "sr_module_entity" ("id" serial primary key, "module_id" int not null, "staking_module_address" varchar(42) not null, "staking_module_fee" int not null, "treasury_fee" int not null, "target_share" int not null, "status" int not null, "name" varchar(255) not null, "last_deposit_at" int not null, "last_deposit_block" int not null, "exited_validators_count" int not null, "type" varchar(255) not null, "active" boolean not null, "nonce" int not null);',
    );
    this.addSql(
      'alter table "sr_module_entity" add constraint "sr_module_entity_module_id_unique" unique ("module_id");',
    );
    this.addSql(
      'alter table "sr_module_entity" add constraint "sr_module_entity_staking_module_address_unique" unique ("staking_module_address");',
    );

    this.addSql('drop table if exists "registry_meta" cascade;');

    this.addSql('alter table "registry_key" add column "module_address" varchar(255) not null;');
    this.addSql('alter table "registry_key" drop constraint "registry_key_pkey";');
    this.addSql(
      'alter table "registry_key" add constraint "registry_key_pkey" primary key ("index", "operator_index", "module_address");',
    );

    this.addSql('alter table "registry_operator" add column "module_address" varchar(255) not null;');
    this.addSql('alter table "registry_operator" alter column "index" type int using ("index"::int);');
    this.addSql('alter table "registry_operator" drop constraint "registry_operator_pkey";');
    this.addSql('alter table "registry_operator" alter column "index" drop default;');
    this.addSql(
      'alter table "registry_operator" add constraint "registry_operator_pkey" primary key ("index", "module_address");',
    );
  }

  async down(): Promise<void> {
    // it will not work for keys of different modules with the same index and operatorIndex
    // also we will get  column "module_address" of relation "registry_key" contains null values during up of this transaction
    // it is the reason why truncate was added here
    this.addSql('TRUNCATE registry_key');
    this.addSql('TRUNCATE registry_operator');

    this.addSql(
      'create table "registry_meta" ("block_number" serial primary key, "block_hash" varchar not null default null, "keys_op_index" int4 not null default null, "timestamp" int4 not null default null);',
    );

    this.addSql('drop table if exists "el_meta_entity" cascade;');

    this.addSql('drop table if exists "sr_module_entity" cascade;');

    this.addSql('alter table "registry_key" drop constraint "registry_key_pkey";');
    this.addSql('alter table "registry_key" drop column "module_address";');
    this.addSql(
      'alter table "registry_key" add constraint "registry_key_pkey" primary key ("index", "operator_index");',
    );

    this.addSql('alter table "registry_operator" alter column "index" type int4 using ("index"::int4);');
    this.addSql('alter table "registry_operator" drop constraint "registry_operator_pkey";');
    this.addSql('alter table "registry_operator" drop column "module_address";');
    this.addSql('create sequence if not exists "registry_operator_index_seq";');
    this.addSql('select setval(\'registry_operator_index_seq\', (select max("index") from "registry_operator"));');
    this.addSql(
      'alter table "registry_operator" alter column "index" set default nextval(\'registry_operator_index_seq\');',
    );
    this.addSql('alter table "registry_operator" add constraint "registry_operator_pkey" primary key ("index");');
  }
}
