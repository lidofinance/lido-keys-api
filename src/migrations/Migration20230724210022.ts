import { Migration } from '@mikro-orm/migrations';

export class Migration20230724210022 extends Migration {
  public async up(): Promise<void> {
    this.addSql('ALTER TABLE "srmodule_entity" RENAME TO "sr_module_entity"');
  }

  public async down(): Promise<void> {
    this.addSql('ALTER TABLE "sr_module_entity"  RENAME TO "srmodule_entity"');
  }
}
