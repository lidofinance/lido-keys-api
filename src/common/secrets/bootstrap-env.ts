/**
 * Applies the secrets file to the environment, at import time.
 *
 * It has to happen before anything else reads process.env, and several modules do that while they
 * are still being loaded — the ORM configuration is one — so doing it inside bootstrap() would
 * already be too late. That is why main.ts imports this module first.
 *
 * Anything the runtime itself reads is still out of reach at this point: NODE_OPTIONS is consumed
 * before a line of this runs, so it belongs in the environment and never in the file.
 */
import { DEFAULT_SECRETS_FILE_PATH, loadSecretsIntoEnv } from './secrets';

export const SECRETS_FILE_PATH = process.env.SECRETS_FILE_PATH || DEFAULT_SECRETS_FILE_PATH;

export const SECRETS_POLL_INTERVAL_IN_SECONDS = Number(process.env.SECRETS_POLL_INTERVAL_IN_SECONDS) || undefined;

function load(): Record<string, string> {
  try {
    return loadSecretsIntoEnv(SECRETS_FILE_PATH);
  } catch (error) {
    // The environment still holds a working configuration, so a bad render costs nothing here.
    // console, not the logger: the logger is built from the configuration this is producing.
    console.error(`Secrets file ${SECRETS_FILE_PATH} is unusable, reading configuration from the environment`, error);
    return {};
  }
}

/** What the file put into the environment. Empty means the configuration came from the environment. */
export const SECRETS_IN_FORCE: Record<string, string> = load();
