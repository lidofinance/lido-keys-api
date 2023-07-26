import { Migration } from '@mikro-orm/migrations';

export class Migration20230724194333 extends Migration {
  public async up(): Promise<void> {
    if (process.env.CHAIN_ID == '1') {
      this.addSql("UPDATE registry_key SET module_address = '0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5'");
      return;
    }

    if (process.env.CHAIN_ID == '5') {
      this.addSql("UPDATE registry_key SET module_address =  '0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320'");
      return;
    }

    //TODO: will have problem on new testnet for example
    // maybe better instead of this migration truncate values in db but than update will take more time for holders
    // I prefer second way

    // TODO: can be solved by check if db empty dont do anything

    throw new Error('CHAIN_ID is wrong, it should be 1 or 5');
  }

  public async down(): Promise<void> {
    if (process.env.CHAIN_ID === '1') {
      this.addSql('UPDATE registry_key SET module_address = NULL');
    } else if (process.env.CHAIN_ID === '5') {
      this.addSql('UPDATE registry_key SET module_address = NULL');
    } else {
      throw new Error('CHAIN_ID is wrong, it should be 1 or 5');
    }
  }
}
