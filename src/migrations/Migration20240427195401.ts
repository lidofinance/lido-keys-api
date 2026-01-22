import { Migration } from '@mikro-orm/migrations';

export class Migration20240427195401 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'create table "app_info_entity" ("chain_id" serial primary key, "locator_address" varchar(42) not null);',
    );
    this.addSql(
      'alter table "app_info_entity" add constraint "app_info_entity_locator_address_unique" unique ("locator_address");',
    );
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "app_info_entity" cascade;');
  }
}
