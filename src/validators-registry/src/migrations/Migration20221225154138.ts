import { Migration } from '@mikro-orm/migrations';

/**
 * PLEASE DO NOT EDIT !!!
 *
 * This migration can be used in the applications that use this module.
 */
export class Migration20221225154138 extends Migration {
  /**
   * @see ConsensusValidatorEntity
   * @see ConsensusMetaEntity
   */
  async up() {
    /**
     * @see ConsensusValidatorEntity
     */
    this.addSql(`create table "consensus_validator" (
      "index" int not null, 
      "pubkey" varchar(98) primary key not null, 
      "status" varchar(128) not null,
      constraint "index" unique ("index"));
  `);

    /**
     * @see ConsensusMetaEntity
     */
    this.addSql(`create table "consensus_meta" (
    "id" smallint primary key, 
    "epoch" int not null, 
    "slot" int not null, 
    "slot_state_root" varchar(66) not null,
    "block_number" int not null,
    "block_hash" varchar(66) not null, 
    "timestamp" int not null);
    `);
  }

  async down() {
    /**
     * @see RegistryKey
     */
    this.addSql('drop table if exists "consensus_validator" cascade;');

    /**
     * @see ConsensusMetaEntity
     */
    this.addSql('drop table if exists "consensus_meta" cascade;');
  }
}
