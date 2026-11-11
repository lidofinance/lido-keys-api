import { readFileSync } from 'fs';

export interface BuildInfo {
  readonly branch: string;
  readonly commit: string;
}

// The image build writes build-info.json from the BUILD_BRANCH and BUILD_COMMIT build args (see the Dockerfile);
// the committed placeholder keeps builds without them working.
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
