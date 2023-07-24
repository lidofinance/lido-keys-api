import { Migration } from '@mikro-orm/migrations';

export class Migration20230721112455 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'create table "el_meta_entity" ("block_number" serial primary key, "block_hash" varchar(66) not null, "timestamp" int not null);',
    );
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "el_meta_entity" cascade;');
  }
}
