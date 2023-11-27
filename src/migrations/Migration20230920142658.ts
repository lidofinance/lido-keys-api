import { Migration } from '@mikro-orm/migrations';

export class Migration20230920142658 extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table "sr_module_entity" rename column "staking_module_fee" to "module_fee";');
  }

  async down(): Promise<void> {
    this.addSql('alter table "sr_module_entity" rename column "module_fee" to "staking_module_fee";');
  }
}
