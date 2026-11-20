// For code that runs before the Nest logger exists: the secrets file loader, env validation, ConfigService,
// the MikroORM config and the failed start. Lines come out in the LOG_FORMAT of the app logger, through the same
// formats of @lido-nestjs/logger, so the same secrets mask applies.
// console, not a winston transport: it writes to stdout directly, while console.error keeps errors on stderr,
// and the lines are out before the process.exit that usually follows.
import { json, simple } from '@lido-nestjs/logger';

const LEVEL = Symbol.for('level');
const MESSAGE = Symbol.for('message');

// LOG_LEVEL values that leave out info lines. Read raw: validation may not have run yet.
const QUIET_LOG_LEVELS = ['error', 'warning'];

export interface BootstrapLogger {
  error(message: string, meta?: Record<string, unknown>): void;
  log(message: string, meta?: Record<string, unknown>): void;
}

export function createBootstrapLogger(
  secrets: string[],
  env: Record<string, unknown> = process.env,
  context = 'Bootstrap',
): BootstrapLogger {
  // Anything but simple is json: LOG_FORMAT defaults to json, and an invalid value is reported by validation.
  const format = env.LOG_FORMAT === 'simple' ? simple({ secrets }) : json({ secrets });
  const quiet = QUIET_LOG_LEVELS.includes(String(env.LOG_LEVEL));

  const line = (level: string, message: string, meta: Record<string, unknown> = {}): string => {
    const info = format.transform({ ...meta, context, level, message, [LEVEL]: level });
    return info ? String(info[MESSAGE]) : '';
  };

  return {
    error: (message, meta) => console.error(line('error', message, meta)),
    log: (message, meta) => {
      if (!quiet) console.log(line('info', message, meta));
    },
  };
}
