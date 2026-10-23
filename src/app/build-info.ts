import { readFileSync } from 'fs';

export interface BuildInfo {
  readonly branch: string;
  readonly commit: string;
}

// The shared build pipeline rewrites build-info.json in the checkout before the image is built;
// the committed placeholder keeps local and dev builds working without it.
export const readBuildInfo = (path = 'build-info.json'): BuildInfo => {
  let parsed: Partial<BuildInfo>;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf-8')) as Partial<BuildInfo>;
  } catch {
    parsed = {};
  }
  return {
    branch: typeof parsed.branch === 'string' ? parsed.branch : 'unknown',
    commit: typeof parsed.commit === 'string' ? parsed.commit : 'unknown',
  };
};
