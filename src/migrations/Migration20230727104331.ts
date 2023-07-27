import { Migration } from '@mikro-orm/migrations';

export class Migration20230727104331 extends Migration {
  async up(): Promise<void> {
    this.addSql('drop table if exists "registry_meta" cascade;');
  }

  async down(): Promise<void> {
    this.addSql(
      'create table "registry_meta" ("block_number" serial primary key, "block_hash" varchar not null default null, "keys_op_index" int4 not null default null, "timestamp" int4 not null default null);',
    );
  }
}
