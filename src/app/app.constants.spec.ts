import { readFileSync } from 'fs';
import { join } from 'path';

describe('app constants', () => {
  const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));
  const savedEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it('reads name, version and description from package.json without the npm_package_* variables', () => {
    // as when the image runs `node dist/main` instead of a yarn script
    delete process.env.npm_package_name;
    delete process.env.npm_package_version;
    delete process.env.npm_package_description;

    jest.isolateModules(() => {
      // a fresh require, so the module reads its constants with the cleared environment
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { APP_NAME, APP_VERSION, APP_DESCRIPTION } = require('./app.constants');

      expect(APP_VERSION).toBe(pkg.version);
      expect(APP_NAME).toBe(pkg.name);
      expect(APP_DESCRIPTION).toBe(pkg.description);
    });
  });
});
