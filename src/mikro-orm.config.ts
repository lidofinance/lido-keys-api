/* eslint-disable @typescript-eslint/no-var-requires  */
import { Options, Utils } from '@mikro-orm/core';
import * as dotenv from 'dotenv';
import * as glob from 'glob';
import * as path from 'path';
import { MigrationObject } from '@mikro-orm/core/typings';
import { RegistryMeta, RegistryOperator, RegistryKey } from '@lido-nestjs/registry';
dotenv.config();

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

  const migrations = filenames
    .map((filename) => {
      const module = require(filename);
      const ext = path.extname(filename);
      const fileNameWithoutExt = path.basename(filename, ext);

      const clazz = module[fileNameWithoutExt];

      if (clazz) {
        return { name: fileNameWithoutExt, class: clazz };
      }

      return null;
    })
    .filter((i) => i);

  // TODO think about Nest.js logger
  console.log(`Found [${migrations.length}] DB migration files.`);

  return migrations;
};

// TODO move this to nestjs packages
const getMigrationOptions = (mainMigrationsFolder: string, npmPackageNames: string[]): Options['migrations'] => {
  return {
    tableName: 'mikro_orm_migrations', // name of database table with log of executed transactions
    path: mainMigrationsFolder, // path to the folder with migrations
    transactional: true, // wrap each migration in a transaction
    disableForeignKeys: true, // wrap statements with `set foreign_key_checks = 0` or equivalent
    allOrNothing: true, // wrap all migrations in master transaction
    dropTables: true, // allow to disable table dropping
    safe: false, // allow to disable table and column dropping
    snapshot: false, // save snapshot when creating new migrations
    emit: 'ts', // migration generation mode,
    migrationsList: findMigrations(mainMigrationsFolder, npmPackageNames),
  };
};

const config: Options = {
  type: 'postgresql',
  dbName: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  entities: [RegistryKey, RegistryOperator, RegistryMeta],
  migrations: getMigrationOptions(path.join(__dirname, 'migrations'), ['@lido-nestjs/registry']),
};

export default config;
