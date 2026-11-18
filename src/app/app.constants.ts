import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';

// The image starts the app with `node`, without yarn, so the npm_package_* variables are not set:
// read the fields from the nearest package.json above this file instead.
const readPackageJson = (): { name?: string; version?: string; description?: string } => {
  for (let dir = __dirname; ; dir = dirname(dir)) {
    const file = join(dir, 'package.json');
    if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf-8'));
    if (dirname(dir) === dir) return {};
  }
};

const pkg = readPackageJson();

export const APP_VERSION = pkg.version ?? 'unversioned';
export const APP_NAME = pkg.name ?? 'lido-keys-api';
export const APP_DESCRIPTION = pkg.description ?? 'lido-keys-api';
