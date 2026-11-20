// Applies the secrets file at import time: modules read process.env while they load, so doing
// this inside bootstrap() would already be too late.
import { DEFAULT_SECRETS_FILE_PATH, loadSecretsIntoEnv } from './secrets';
import { bootstrapSecrets } from './bootstrap-secrets';
import { BootstrapLogger, createBootstrapLogger } from '../logger/bootstrap-logger';

export const SECRETS_FILE_PATH = process.env.SECRETS_FILE_PATH || DEFAULT_SECRETS_FILE_PATH;

export const SECRETS_POLL_INTERVAL_IN_SECONDS = Number(process.env.SECRETS_POLL_INTERVAL_IN_SECONDS) || undefined;

function load(): Record<string, string> {
  try {
    return loadSecretsIntoEnv(SECRETS_FILE_PATH);
  } catch (error) {
    // Not the app logger: it is built from the configuration this produces. Nothing came from the file, so
    // only the environment has secrets to mask.
    createBootstrapLogger(bootstrapSecrets(process.env)).error(
      `Secrets file ${SECRETS_FILE_PATH} is unusable, reading configuration from the environment`,
      { error },
    );
    return {};
  }
}

/** Empty means the configuration came from the environment. */
export const SECRETS_IN_FORCE: Record<string, string> = load();

/**
 * The logger for code that runs before the app logger exists. It masks the secrets of the configuration and of
 * the secrets file. Here, next to SECRETS_IN_FORCE, so every caller gets the file values without passing them.
 * @param config the raw configuration, when it is not process.env (env validation)
 */
export function bootstrapLogger(config: Record<string, unknown> = process.env): BootstrapLogger {
  return createBootstrapLogger(bootstrapSecrets(config, SECRETS_IN_FORCE), config);
}
