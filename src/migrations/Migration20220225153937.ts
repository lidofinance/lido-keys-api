import { Migration } from '@mikro-orm/migrations';

/**
 * PLEASE DO NOT EDIT !!!
 *
 * This migration can be used in the applications that use this module.
 */
export class Migration20220225153937 extends Migration {
  /**
   * @see RegistryKey
   * @see RegistryMeta
   * @see RegistryOperator
   */
  async up() {
    /**
     * @see RegistryKey
     */
    this.addSql(`create table "registry_key" (
      "index" int not null, 
      "operator_index" int not null, 
      "key" varchar(98) not null, 
      "deposit_signature" varchar(194) not null, 
      "used" boolean not null, 
      constraint "registry_key_pkey" primary key ("index", "operator_index"));
  `);

    /**
     * @see RegistryMeta
     */
    this.addSql(`create table "registry_meta" (
    "block_number" serial primary key, 
    "block_hash" varchar(66) not null, 
    "keys_op_index" int not null, 
    "timestamp" int not null);
    `);

    /**
     * @see RegistryOperator
     */
    this.addSql(`create table "registry_operator" (
      "index" serial primary key,
      "active" boolean not null, 
      "name" varchar(256) not null, 
      "reward_address" varchar(42) not null, 
      "staking_limit" int not null, 
      "stopped_validators" int not null, 
      "total_signing_keys" int not null,
      "used_signing_keys" int not null);
  `);
  }

  async down() {
    /**
     * @see RegistryKey
     */
    this.addSql('drop table if exists "registry_key" cascade;');

    /**
     * @see RegistryMeta
     */
    this.addSql('drop table if exists "registry_meta" cascade;');

    /**
     * @see RegistryOperator
     */
    this.addSql('drop table if exists "registry_operator" cascade;');
  }
}
