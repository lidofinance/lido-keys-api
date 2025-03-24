import { ConfigService as ConfigServiceSource } from '@nestjs/config';
import { EnvironmentVariables } from './env.validation';
import { readFileSync } from 'fs';

export class ConfigService extends ConfigServiceSource<EnvironmentVariables> {
  /**
   * List of env variables that should be hidden
   */
  public get secrets(): string[] {
    return [this.get('SENTRY_DSN') ?? '', ...(this.get('CL_API_URLS') || []), ...this.get('PROVIDERS_URLS')]
      .filter((v) => v)
      .map((v) => String(v));
  }

  public get<T extends keyof EnvironmentVariables>(key: T): EnvironmentVariables[T] {
    const value = super.get(key, { infer: true }) as EnvironmentVariables[T];

    // return values for all envs
    // but for DB_PASSWORD return only if it is non empty string
    if (key !== 'DB_PASSWORD' || value) {
      return value;
    }

    const filePath = super.get('DB_PASSWORD_FILE', { infer: true });
    if (!filePath) {
      console.error(`DB_PASSWORD or DB_PASSWORD_FILE environments are not provided.`);
      process.exit(1);
    }
    const password = this.readEnvFromFile(filePath, 'DB_PASSWORD_FILE') as EnvironmentVariables[T];

    if (!password) {
      console.error(
        'File in DB_PASSWORD_FILE doesnt contain a password. Please provide postgresql password via DB_PASSWORD or DB_PASSWORD_FILE envs',
      );
      process.exit(1);
    }

    return password;
  }

  private readEnvFromFile(filePath, envVarFile): string {
    try {
      const fileContent = readFileSync(filePath, 'utf-8')
        .toString()
        .replace(/(\r\n|\n|\r)/gm, '')
        .trim();
      return fileContent;
    } catch (error) {
      const errorCode = (error as any).code;

      switch (errorCode) {
        case 'ENOENT':
          throw new Error(`Failed to load ENV variable from the ${envVarFile}`);
        case 'EACCES':
          throw new Error(`Permission denied when trying to read the file specified by ${envVarFile}`);
        case 'EMFILE':
          throw new Error(`Too many open files in the system when trying to read the file specified by ${envVarFile}`);
        default:
          throw error;
      }
    }
  }
}
