// The secrets to mask before ConfigService exists: read from the raw configuration, the way ConfigService reads them.
// Imports nothing of the app, so the earliest modules can use it.
import { readFileSync } from 'fs';

const SECRET_VALUE_KEYS = ['DB_PASSWORD', 'SENTRY_DSN'];
const SECRET_URL_LIST_KEYS = ['PROVIDERS_URLS', 'CL_API_URLS'];

// The password ConfigService takes from DB_PASSWORD_FILE when DB_PASSWORD is empty, read the same way.
// An unreadable file gives nothing to mask: masking must never fail.
function dbPasswordFromFile(config: Record<string, unknown>): string {
  if (config.DB_PASSWORD || !config.DB_PASSWORD_FILE) return '';
  try {
    return readFileSync(String(config.DB_PASSWORD_FILE), 'utf-8')
      .replace(/(\r\n|\n|\r)/gm, '')
      .trim();
  } catch {
    return '';
  }
}

/**
 * @param config the raw configuration, process.env or what env validation receives
 * @param secretsInForce the values of the secrets file: every one is a secret, whatever its key
 */
export function bootstrapSecrets(
  config: Record<string, unknown>,
  secretsInForce: Record<string, string> = {},
): string[] {
  return [
    ...SECRET_VALUE_KEYS.map((key) => config[key]),
    dbPasswordFromFile(config),
    ...SECRET_URL_LIST_KEYS.flatMap((key) => String(config[key] ?? '').split(',')).map((url) => url.trim()),
    ...Object.values(secretsInForce),
  ]
    .map((value) => (value == null ? '' : String(value)))
    .filter((value) => value.length > 0);
}
