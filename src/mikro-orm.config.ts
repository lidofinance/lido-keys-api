/* eslint-disable @typescript-eslint/no-var-requires  */
import { Options, Utils } from '@mikro-orm/core';
import * as dotenv from 'dotenv';
import * as glob from 'glob';
import * as path from 'path';
import { MigrationObject } from '@mikro-orm/core/typings';
import { RegistryOperator } from './common/registry/storage/operator.entity';
import { RegistryKey } from './common/registry/storage/key.entity';
import { ConsensusMetaEntity } from '@lido-nestjs/validators-registry';
import { ConsensusValidatorEntity } from '@lido-nestjs/validators-registry';
import { readFileSync } from 'fs';
import { SrModuleEntity } from './storage/sr-module.entity';
import { ElMetaEntity } from './storage/el-meta.entity';

dotenv.config();

// https://github.com/mikro-orm/mikro-orm/issues/1842
// disableForeignKeys = false
// default — true
const MIKRO_ORM_DISABLE_FOREIGN_KEYS =
  process.env.MIKRO_ORM_DISABLE_FOREIGN_KEYS === 'true' || process.env.MIKRO_ORM_DISABLE_FOREIGN_KEYS === undefined
    ? true
    : false;

// TODO move this to nestjs packages
const findMigrations = (mainFolder: string, npmPackageNames: string[]): MigrationObject[] => {
  const cwd = process.cwd();
  const folders = [mainFolder, ...npmPackageNames.map((npmPackage) => `./node_modules/${npmPackage}/dist/migrations/`)];
  const filenames = folders
    .map((folder) => {
      const extPattern = Utils.detectTsNode() ? '!(*.d).{js,ts}' : '*.js';
      const filePathPattern = `${path.isAbsolute(folder) ? folder : path.join(cwd, folder)}/Migration${extPattern}`;
      return glob.sync(filePathPattern);
    })
    .flat();

  const isNullOrUndefined = (val: unknown): val is null | undefined => val === null || typeof val === 'undefined';
  const isNotNullOrUndefined = <T>(val: T | undefined | null): val is T => !isNullOrUndefined(val);

  const migrations = filenames
    .map((filename) => {
      const module = require(filename);
      const ext = path.extname(filename);
      const fileNameWithoutExt = path.basename(filename, ext);
      // TODO: readable var name
      const migrationClass = module[fileNameWithoutExt];

      if (migrationClass) {
        return { name: fileNameWithoutExt, class: migrationClass };
      }

      return null;
    })
    .filter(isNotNullOrUndefined)
    .sort((n1, n2) => (n1.name > n2.name ? 1 : -1));

  if (hasDuplicatesByName(migrations)) {
    console.error('Found duplicated migration name in list');
    process.exit(1);
  }

  // TODO think about Nest.js logger
  console.log(`Found [${migrations.length}] DB migration files.`);
  // console.log(migrations);

  return migrations;
};

interface Migration {
  name: string;
  class: any;
}

function hasDuplicatesByName(list: Migration[]): boolean {
  const namesSet = new Set<string>();
  for (const item of list) {
    if (namesSet.has(item.name)) {
      return true; // Duplicate name found
    }
    namesSet.add(item.name);
  }
  return false; // No duplicate names found
}

// TODO move this to nestjs packages
const getMigrationOptions = (mainMigrationsFolder: string, npmPackageNames: string[]): Options['migrations'] => {
  return {
    tableName: 'mikro_orm_migrations', // name of database table with log of executed transactions
    path: mainMigrationsFolder, // path to the folder with migrations
    transactional: true, // wrap each migration in a transaction
    disableForeignKeys: MIKRO_ORM_DISABLE_FOREIGN_KEYS, // wrap statements with `set foreign_key_checks = 0` or equivalent
    allOrNothing: true, // wrap all migrations in master transaction
    dropTables: true, // allow to disable table dropping
    safe: false, // allow to disable table and column dropping
    snapshot: false, // save snapshot when creating new migrations
    emit: 'ts', // migration generation mode,
    migrationsList: findMigrations(mainMigrationsFolder, npmPackageNames),
  };
};

const DB_PASSWORD =
  process.env.DB_PASSWORD ||
  (process.env.DB_PASSWORD_FILE &&
    readFileSync(process.env.DB_PASSWORD_FILE, 'utf-8')
      .toString()
      .replace(/(\r\n|\n|\r)/gm, '')
      .trim());

if (!DB_PASSWORD) {
  console.error('Please set postgres password in DB_PASSWORD or in file DB_PASSWORD_FILE');
  process.exit(1);
}

const config: Options = {
  type: 'postgresql',
  dbName: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: parseInt(process?.env?.DB_PORT ?? '', 10),
  user: process.env.DB_USER,
  password: DB_PASSWORD,
  entities: [
    RegistryKey,
    RegistryOperator,
    ConsensusValidatorEntity,
    ConsensusMetaEntity,
    SrModuleEntity,
    ElMetaEntity,
  ],
  migrations: getMigrationOptions(path.join(__dirname, 'migrations'), ['@lido-nestjs/validators-registry']),
};

export default config;
