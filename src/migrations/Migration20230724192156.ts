import { Migration } from '@mikro-orm/migrations';

export class Migration20230724192156 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'create table "el_meta_entity" ("block_number" int not null, "block_hash" varchar(255) not null, "timestamp" int not null, constraint "el_meta_entity_pkey" primary key ("block_number", "block_hash"));',
    );

    this.addSql(
      'create table "srmodule_entity" ("id" int not null, "staking_module_address" varchar(255) not null, "staking_module_fee" int not null, "target_share" int not null, "status" int not null, "name" varchar(255) not null, "last_deposit_at" int not null, "last_deposit_block" int not null, "exited_validators_count" int not null, "type" varchar(255) not null, "active" boolean not null, "nonce" int not null, constraint "srmodule_entity_pkey" primary key ("id", "staking_module_address"));',
    );

    this.addSql('alter table "consensus_meta" alter column "id" type smallint using ("id"::smallint);');
    this.addSql('alter table "consensus_meta" alter column "id" set default 0;');
    this.addSql('alter table "consensus_meta" drop constraint "consensus_meta_pkey";');
    this.addSql('alter table "consensus_meta" add constraint "consensus_meta_id_unique" unique ("id");');
    this.addSql(
      'alter table "consensus_meta" add constraint "consensus_meta_pkey" primary key ("id", "block_number");',
    );

    this.addSql(
      'alter table "consensus_validator" alter column "pubkey" type varchar(255) using ("pubkey"::varchar(255));',
    );
    this.addSql(
      'alter table "consensus_validator" alter column "status" type varchar(255) using ("status"::varchar(255));',
    );
    this.addSql('alter table "consensus_validator" drop constraint "index";');
    this.addSql('create index "consensus_validator_index_index" on "consensus_validator" ("index");');
    this.addSql('alter index "idx_consensus_validator__status" rename to "consensus_validator_status_index";');

    this.addSql('alter table "registry_key" add column "module_address" varchar(255) null;');
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "el_meta_entity" cascade;');

    this.addSql('drop table if exists "srmodule_entity" cascade;');

    this.addSql('alter table "consensus_meta" alter column "id" drop default;');
    this.addSql('alter table "consensus_meta" alter column "id" type int2 using ("id"::int2);');
    this.addSql('alter table "consensus_meta" drop constraint "consensus_meta_id_unique";');
    this.addSql('alter table "consensus_meta" drop constraint "consensus_meta_pkey";');
    this.addSql('alter table "consensus_meta" add constraint "consensus_meta_pkey" primary key ("id");');

    this.addSql('alter table "consensus_validator" alter column "pubkey" type varchar using ("pubkey"::varchar);');
    this.addSql('alter table "consensus_validator" alter column "status" type varchar using ("status"::varchar);');
    this.addSql('drop index "consensus_validator_index_index";');
    this.addSql('alter table "consensus_validator" add constraint "index" unique ("index");');
    this.addSql('alter index "consensus_validator_status_index" rename to "idx_consensus_validator__status";');

    this.addSql('alter table "registry_key" drop column "module_address";');
  }
}
