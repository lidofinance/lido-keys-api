import { Migration } from '@mikro-orm/migrations';

export class Migration20230831171550 extends Migration {
  async up(): Promise<void> {
    this.addSql('TRUNCATE registry_key');
    this.addSql('TRUNCATE registry_operator');
    this.addSql('TRUNCATE registry_meta');
  }
}
