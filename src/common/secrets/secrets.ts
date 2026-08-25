/**
 * Credentials that arrive as a file, and how a change to one is noticed.
 *
 * Execution and consensus endpoints carry provider credentials. Where they are delivered as a
 * file, a rotation reaches the container without anything restarting the process — and a process
 * cannot be handed new environment variables from outside, so a rotation nobody applies looks
 * exactly like a healthy deployment until the provider revokes the key.
 *
 * The writer replaces the file by renaming a temporary file over the path. That is atomic, so a
 * reader never sees half a file, but it also means a new inode each time — which is why the path
 * is polled with stat() rather than watched. A watcher bound to the file goes silent after the
 * first rotation.
 *
 * No file means the values come from the environment, which is how the non-Kubernetes deployment
 * runs. The variable names and the semantics are a sibling service's, so one description covers
 * both and neither drifts.
 */
import { readFileSync, statSync } from 'fs';

/** Where the delivering agent is configured to render, and how often the path is checked. */
export const DEFAULT_SECRETS_FILE_PATH = '/vault/secrets/config';
export const DEFAULT_SECRETS_POLL_INTERVAL_IN_SECONDS = 10;

/**
 * The file's values, or an empty object when there is no file.
 *
 * Absent is not an error — it is the environment-only deployment. Present but unparseable throws,
 * and every caller here reports it and then carries on with the environment: refusing to start
 * would turn a bad render of one key into an outage of the whole service.
 */
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
    // A key rendered as null is a template that resolved to nothing. Dropped rather than kept as
    // the string "null", which would reach a URL parser as a hostname.
    if (value === null || value === undefined) continue;
    values[key] = String(value);
  }
  return values;
}

/** The path's mtime in milliseconds, or null when there is nothing at the path. */
export function secretsFileMtimeMs(path: string): number | null {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return null;
  }
}

/**
 * Makes the file the source of truth for everything read through the environment.
 *
 * One place rather than a lookup at every call site: the values a rotation can change are the
 * ones the environment already carries, and two sources consulted in different orders by
 * different readers is how a service ends up half-rotated. Returns what it applied.
 */
export function loadSecretsIntoEnv(path: string): Record<string, string> {
  const values = readSecretsFile(path);
  for (const [key, value] of Object.entries(values)) {
    process.env[key] = value;
  }
  return values;
}

/** Keys whose value differs between two renders, including ones the newer render dropped. */
export function changedSecretKeys(before: Record<string, string>, after: Record<string, string>): string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((key) => before[key] !== after[key]).sort();
}

export interface SecretsWatcherOptions {
  intervalInSeconds?: number;
  /** What the process is running on, so a re-render of unchanged values is not a rotation. */
  inForce?: Record<string, string>;
  onChange: (changed: string[], values: Record<string, string>) => void;
  onError: (error: Error) => void;
}

/** Polls the path and reports a render that actually changed a value. */
export class SecretsWatcher {
  private mtime: number | null;
  private inForce: Record<string, string>;
  private timer: NodeJS.Timeout | undefined;

  constructor(private readonly path: string, private readonly options: SecretsWatcherOptions) {
    // Starting from the current mtime, so the first poll does not re-report what the process was
    // configured with.
    this.mtime = secretsFileMtimeMs(path);
    this.inForce = { ...(options.inForce ?? {}) };
  }

  /** True when a changed render was seen. Separate from the loop so the behaviour is testable. */
  public checkOnce(): boolean {
    const mtime = secretsFileMtimeMs(this.path);
    if (mtime === null || mtime === this.mtime) return false;
    // Remembered before the contents are judged, so an unusable render is reported once rather
    // than at every poll for as long as it sits there.
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
    // The agent re-renders on a schedule; only a render that moved a value is a rotation.
    if (changed.length === 0) return false;

    this.inForce = values;
    this.options.onChange(changed, values);
    return true;
  }

  public start(): void {
    if (this.timer) return;
    const seconds = this.options.intervalInSeconds ?? DEFAULT_SECRETS_POLL_INTERVAL_IN_SECONDS;
    this.timer = setInterval(() => this.checkOnce(), seconds * 1000);
    // The poll must never be the reason the process is still alive while it is shutting down.
    this.timer.unref();
  }

  public stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }
}
