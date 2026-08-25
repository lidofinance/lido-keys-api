// Applies the secrets file at import time: modules read process.env while they load, so doing
// this inside bootstrap() would already be too late.
import { DEFAULT_SECRETS_FILE_PATH, loadSecretsIntoEnv } from './secrets';

export const SECRETS_FILE_PATH = process.env.SECRETS_FILE_PATH || DEFAULT_SECRETS_FILE_PATH;

export const SECRETS_POLL_INTERVAL_IN_SECONDS = Number(process.env.SECRETS_POLL_INTERVAL_IN_SECONDS) || undefined;

function load(): Record<string, string> {
  try {
    return loadSecretsIntoEnv(SECRETS_FILE_PATH);
  } catch (error) {
    // console, not the logger: the logger is built from the configuration this produces.
    console.error(`Secrets file ${SECRETS_FILE_PATH} is unusable, reading configuration from the environment`, error);
    return {};
  }
}

/** Empty means the configuration came from the environment. */
export const SECRETS_IN_FORCE: Record<string, string> = load();
