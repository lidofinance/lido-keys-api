import { mkdtempSync, renameSync, rmSync, utimesSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { changedSecretKeys, loadSecretsIntoEnv, readSecretsFile, secretsFileMtimeMs, SecretsWatcher } from './secrets';

describe('secrets file', () => {
  let dir: string;
  let path: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'kapi-secrets-'));
    path = join(dir, 'config');
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  // Replaces the file the way the delivering agent does: a temporary file renamed over the path,
  // which gives it a new inode every time.
  const render = (contents: string, secondsAhead = 1) => {
    const tmp = `${path}.tmp`;
    writeFileSync(tmp, contents, { mode: 0o600 });
    renameSync(tmp, path);
    // Nudged forward explicitly: two renders inside one filesystem tick would be indistinguishable.
    const when = new Date(Date.now() + secondsAhead * 1000);
    utimesSync(path, when, when);
  };

  describe('readSecretsFile', () => {
    it('reads an absent file as no values rather than as an error', () => {
      expect(readSecretsFile(join(dir, 'nothing-here'))).toEqual({});
      expect(readSecretsFile('')).toEqual({});
    });

    it('stringifies values and drops the ones that rendered to nothing', () => {
      render('{"PROVIDERS_URLS":"http://el.example.com:8545","STREAM_TIMEOUT":1500,"EMPTY":null}');

      const values = readSecretsFile(path);

      expect(values.PROVIDERS_URLS).toBe('http://el.example.com:8545');
      // A number in the file must not reach a parser as a number, and a null must not reach one
      // as the string "null".
      expect(values.STREAM_TIMEOUT).toBe('1500');
      expect('EMPTY' in values).toBe(false);
    });

    it.each([
      ['not json at all', 'nope'],
      ['a shell fragment, which is what the previous template rendered', 'export PROVIDERS_URLS="http://el:8545"'],
      ['a JSON array', '["http://el.example.com:8545"]'],
      ['JSON null', 'null'],
      ['an empty file', ''],
    ])('refuses %s instead of accepting it silently', (_name, contents) => {
      render(contents);
      expect(() => readSecretsFile(path)).toThrow();
    });

    it('reads a file that parses to nothing as no values', () => {
      render('{}');
      expect(readSecretsFile(path)).toEqual({});
    });
  });

  describe('secretsFileMtimeMs', () => {
    it('is null when there is nothing at the path', () => {
      expect(secretsFileMtimeMs(join(dir, 'nothing-here'))).toBeNull();
    });

    it('moves when the path is renamed over', () => {
      render('{"A":"1"}');
      const before = secretsFileMtimeMs(path);
      render('{"A":"2"}', 2);
      expect(secretsFileMtimeMs(path)).not.toBe(before);
    });
  });

  describe('changedSecretKeys', () => {
    it('reports a new value, a new key and a key that disappeared', () => {
      expect(changedSecretKeys({ A: '1', GONE: 'x' }, { A: '2', ADDED: 'y' })).toEqual(['A', 'ADDED', 'GONE']);
    });

    it('reports nothing for an identical render', () => {
      expect(changedSecretKeys({ A: '1' }, { A: '1' })).toEqual([]);
    });
  });

  describe('loadSecretsIntoEnv', () => {
    const KEY = 'KAPI_SECRETS_SPEC_URLS';

    afterEach(() => delete process.env[KEY]);

    it('puts the file over the environment', () => {
      process.env[KEY] = 'http://from-env.example.com:8545';
      render(`{"${KEY}":"http://from-file.example.com:8545"}`);

      const applied = loadSecretsIntoEnv(path);

      expect(applied).toEqual({ [KEY]: 'http://from-file.example.com:8545' });
      expect(process.env[KEY]).toBe('http://from-file.example.com:8545');
    });

    it('leaves the environment alone when there is no file', () => {
      process.env[KEY] = 'http://from-env.example.com:8545';

      expect(loadSecretsIntoEnv(join(dir, 'nothing-here'))).toEqual({});
      expect(process.env[KEY]).toBe('http://from-env.example.com:8545');
    });
  });

  describe('SecretsWatcher', () => {
    const watcherOn = (inForce: Record<string, string>) => {
      const changes: string[][] = [];
      const errors: Error[] = [];
      const watcher = new SecretsWatcher(path, {
        inForce,
        onChange: (changed) => changes.push(changed),
        onError: (error) => errors.push(error),
      });
      return { watcher, changes, errors };
    };

    it('sees a rename over the path', () => {
      render('{"PROVIDERS_URLS":"http://one.example.com:8545"}');
      const { watcher, changes } = watcherOn({ PROVIDERS_URLS: 'http://one.example.com:8545' });

      render('{"PROVIDERS_URLS":"http://two.example.com:8545"}', 2);

      expect(watcher.checkOnce()).toBe(true);
      expect(changes).toEqual([['PROVIDERS_URLS']]);
    });

    it('does not call an unchanged file a rotation', () => {
      render('{"PROVIDERS_URLS":"http://one.example.com:8545"}');
      const { watcher, changes, errors } = watcherOn({ PROVIDERS_URLS: 'http://one.example.com:8545' });

      expect(watcher.checkOnce()).toBe(false);

      // The agent re-renders on a schedule; an identical render moves the mtime and nothing else.
      render('{"PROVIDERS_URLS":"http://one.example.com:8545"}', 2);
      expect(watcher.checkOnce()).toBe(false);
      expect(changes).toEqual([]);
      expect(errors).toEqual([]);
    });

    it('reports a key that disappeared', () => {
      render('{"PROVIDERS_URLS":"http://one.example.com:8545","CL_API_URLS":"http://cl.example.com"}');
      const { watcher, changes } = watcherOn({
        PROVIDERS_URLS: 'http://one.example.com:8545',
        CL_API_URLS: 'http://cl.example.com',
      });

      render('{"PROVIDERS_URLS":"http://one.example.com:8545"}', 2);

      expect(watcher.checkOnce()).toBe(true);
      expect(changes).toEqual([['CL_API_URLS']]);
    });

    it.each([
      ['unparseable', 'export PROVIDERS_URLS="http://two.example.com:8545"'],
      ['empty', ''],
      ['parsing to nothing', '{}'],
    ])('keeps the previous values when the render is %s, and reports it once', (_name, contents) => {
      render('{"PROVIDERS_URLS":"http://one.example.com:8545"}');
      const { watcher, changes, errors } = watcherOn({ PROVIDERS_URLS: 'http://one.example.com:8545' });

      render(contents, 2);

      expect(watcher.checkOnce()).toBe(false);
      expect(changes).toEqual([]);
      expect(errors).toHaveLength(1);

      // The mtime is remembered even for a render that cannot be used, so a broken template is one
      // log line rather than one per poll for as long as it is broken.
      expect(watcher.checkOnce()).toBe(false);
      expect(errors).toHaveLength(1);
    });

    it('is quiet while there is no file at all', () => {
      const { watcher, changes, errors } = watcherOn({});

      expect(watcher.checkOnce()).toBe(false);
      expect(changes).toEqual([]);
      expect(errors).toEqual([]);
    });
  });
});
