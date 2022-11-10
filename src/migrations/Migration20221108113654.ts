import { Migration } from '@mikro-orm/migrations';

export class Migration20221108113654 extends Migration {
  async up() {
    this.addSql('create table "test" (' +
        '"id" int not null, ' +
        '"value" varchar(255) not null, ' +
        'constraint "test_pkey2" primary key ("id"));');
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "test" cascade;');
  }
}
