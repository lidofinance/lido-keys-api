// Credentials delivered as a JSON file. The path is polled, never watched: the writer renames a
// temp file over it, so the inode changes on every rotation.
import { readFileSync, statSync } from 'fs';

export const DEFAULT_SECRETS_FILE_PATH = '/vault/secrets/config';
export const DEFAULT_SECRETS_POLL_INTERVAL_IN_SECONDS = 10;

/** The file's values, or an empty object when there is no file. Throws on an unusable one. */
export function readSecretsFile(path: string): Record<string, string> {
  if (!path) return {};

  let blob: string;
  try {
    blob = readFileSync(path, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw new Error(`Can not read secrets file ${path}: ${(error as Error).message}`);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(blob);
  } catch (error) {
    throw new Error(`Can not parse secrets file ${path}: ${(error as Error).message}`);
  }

  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`Secrets file ${path} is not a JSON object`);
  }

  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    // Dropped rather than kept as the string "null", which a URL parser would take as a hostname.
    if (value === null || value === undefined) continue;
    values[key] = String(value);
  }
  return values;
}

export function secretsFileMtimeMs(path: string): number | null {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return null;
  }
}

/** Applies the file over process.env, so every existing reader sees it. Returns what it applied. */
export function loadSecretsIntoEnv(path: string): Record<string, string> {
  const values = readSecretsFile(path);
  for (const [key, value] of Object.entries(values)) {
    process.env[key] = value;
  }
  return values;
}

export function changedSecretKeys(before: Record<string, string>, after: Record<string, string>): string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((key) => before[key] !== after[key]).sort();
}

export interface SecretsWatcherOptions {
  intervalInSeconds?: number;
  inForce?: Record<string, string>;
  onChange: (changed: string[], values: Record<string, string>) => void;
  onError: (error: Error) => void;
}

export class SecretsWatcher {
  private mtime: number | null;
  private inForce: Record<string, string>;
  private timer: NodeJS.Timeout | undefined;

  constructor(private readonly path: string, private readonly options: SecretsWatcherOptions) {
    this.mtime = secretsFileMtimeMs(path);
    this.inForce = { ...(options.inForce ?? {}) };
  }

  public checkOnce(): boolean {
    const mtime = secretsFileMtimeMs(this.path);
    if (mtime === null || mtime === this.mtime) return false;
    // Remembered before the contents are judged, so an unusable render is reported once.
    this.mtime = mtime;

    let values: Record<string, string>;
    try {
      values = readSecretsFile(this.path);
    } catch (error) {
      this.options.onError(error as Error);
      return false;
    }

    if (Object.keys(values).length === 0) {
      this.options.onError(
        new Error(`Secrets file ${this.path} changed but has no usable values, keeping the previous ones`),
      );
      return false;
    }

    const changed = changedSecretKeys(this.inForce, values);
    // The writer re-renders on a schedule; only a changed value is a rotation.
    if (changed.length === 0) return false;

    this.inForce = values;
    this.options.onChange(changed, values);
    return true;
  }

  public start(): void {
    if (this.timer) return;
    const seconds = this.options.intervalInSeconds ?? DEFAULT_SECRETS_POLL_INTERVAL_IN_SECONDS;
    this.timer = setInterval(() => this.checkOnce(), seconds * 1000);
    this.timer.unref();
  }

  public stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }
}
