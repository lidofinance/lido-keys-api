import { createBootstrapLogger } from './bootstrap-logger';

// nosemgrep: semgrep.detected-generic-secrets -- test-only non-secret value
const SECRET = 'hunter2hunter2';
const MASKED = '*'.repeat(SECRET.length);

describe('createBootstrapLogger', () => {
  let errors: string[];
  let logs: string[];

  beforeEach(() => {
    errors = [];
    logs = [];
    jest.spyOn(console, 'error').mockImplementation((line) => void errors.push(line));
    jest.spyOn(console, 'log').mockImplementation((line) => void logs.push(line));
  });

  afterEach(() => jest.restoreAllMocks());

  describe('LOG_FORMAT json, the default', () => {
    it('writes an error as one JSON line on stderr, with the level and the context', () => {
      createBootstrapLogger([], {}).error('first line\nsecond line');

      expect(errors).toHaveLength(1);
      expect(errors[0]).not.toContain('\n');
      expect(JSON.parse(errors[0])).toEqual({
        context: 'Bootstrap',
        level: 'error',
        message: 'first line\nsecond line',
      });
    });

    it('writes an info line on stdout', () => {
      createBootstrapLogger([], {}).log('Found [3] DB migration files.');

      expect(errors).toHaveLength(0);
      expect(JSON.parse(logs[0])).toEqual({
        context: 'Bootstrap',
        level: 'info',
        message: 'Found [3] DB migration files.',
      });
    });

    it('masks the secrets in the message and in the error passed along', () => {
      createBootstrapLogger([SECRET], {}).error(`pw ${SECRET} rejected`, { error: new Error(`boom ${SECRET}`) });

      expect(errors[0]).not.toContain(SECRET);
      const line = JSON.parse(errors[0]);
      expect(line.message).toBe(`pw ${MASKED} rejected`);
      expect(line.error.message).toBe(`boom ${MASKED}`);
    });
  });

  it('writes the simple format when LOG_FORMAT is simple, masked as well', () => {
    createBootstrapLogger([SECRET], { LOG_FORMAT: 'simple' }).error(`pw ${SECRET} rejected`);

    expect(() => JSON.parse(errors[0])).toThrow();
    expect(errors[0]).toContain(`pw ${MASKED} rejected`);
    expect(errors[0]).not.toContain(SECRET);
  });

  it.each(['error', 'warning'])('leaves out info lines under LOG_LEVEL %s, keeps errors', (level) => {
    const logger = createBootstrapLogger([], { LOG_LEVEL: level });
    logger.log('info line');
    logger.error('error line');

    expect(logs).toHaveLength(0);
    expect(errors).toHaveLength(1);
  });
});
