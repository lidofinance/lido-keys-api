import { PassThrough } from 'stream';
import { createLogger, transports } from 'winston';
import { LogLevel } from 'common/config/interfaces';
import { toWinstonLevel } from './winston-level';

// The lines a winston logger at `level` writes, out of one line per method.
const writtenAt = (level: string): string[] => {
  const lines: string[] = [];
  const stream = new PassThrough({ objectMode: true });
  stream.on('data', (info) => lines.push(info.message));

  const logger = createLogger({ level, transports: [new transports.Stream({ stream })] });
  for (const method of ['error', 'warn', 'info', 'debug'] as const) logger[method](method);
  return lines;
};

describe('toWinstonLevel', () => {
  it('maps every LOG_LEVEL value to a winston level', () => {
    expect(toWinstonLevel(LogLevel.error)).toBe('error');
    expect(toWinstonLevel(LogLevel.warning)).toBe('warn');
    expect(toWinstonLevel(LogLevel.notice)).toBe('info');
    expect(toWinstonLevel(LogLevel.info)).toBe('info');
    expect(toWinstonLevel(LogLevel.debug)).toBe('debug');
  });

  it('falls back to info for a value outside the enum', () => {
    expect(toWinstonLevel('verbose' as LogLevel)).toBe('info');
  });

  it('the unmapped syslog names make winston drop every line', () => {
    expect(writtenAt('warning')).toEqual([]);
    expect(writtenAt('notice')).toEqual([]);
  });

  it.each([
    [LogLevel.error, ['error']],
    [LogLevel.warning, ['error', 'warn']],
    [LogLevel.notice, ['error', 'warn', 'info']],
    [LogLevel.info, ['error', 'warn', 'info']],
    [LogLevel.debug, ['error', 'warn', 'info', 'debug']],
  ])('LOG_LEVEL=%s writes %j', (level, expected) => {
    expect(writtenAt(toWinstonLevel(level))).toEqual(expected);
  });
});
