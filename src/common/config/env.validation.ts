import { plainToInstance, Transform } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateIf,
  validateSync,
  getMetadataStorage,
} from 'class-validator';
import { Environment, LogLevel, LogFormat, Chain } from './interfaces';
import { NonEmptyArray } from '@lido-nestjs/execution/dist/interfaces/non-empty-array';
import { SECRETS_IN_FORCE } from '../secrets/bootstrap-env';

const toNumber =
  ({ defaultValue }) =>
  ({ value }) => {
    if (value === '' || value == null) {
      return defaultValue;
    }

    return Number(value);
  };

const toBoolean =
  ({ defaultValue }) =>
  ({ value }) => {
    if (value == null || value === '') {
      return defaultValue;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    const str = value.toString().toLowerCase().trim();

    switch (str) {
      case 'true':
      case 'yes':
      case '1':
        return true;

      case 'false':
      case 'no':
      case '0':
        return false;

      default:
        return value;
    }
  };

const toArrayOfUrls = ({ value }): string[] => {
  if (value == null || value === '') {
    return [];
  }

  return value.split(',').map((str) => str.trim().replace(/\/$/, ''));
};

export class EnvironmentVariables {
  @IsOptional()
  @IsEnum(Environment)
  @Transform(({ value }) => value || Environment.development)
  NODE_ENV: Environment = Environment.development;

  @IsOptional()
  @IsInt()
  @Min(1025)
  @Max(65535)
  @Transform(toNumber({ defaultValue: 3000 }))
  PORT = 3000;

  @IsOptional()
  @IsString()
  CORS_WHITELIST_REGEXP = '';

  // value in seconds
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Transform(toNumber({ defaultValue: 5 }))
  GLOBAL_THROTTLE_TTL = 5;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Transform(toNumber({ defaultValue: 100 }))
  GLOBAL_THROTTLE_LIMIT = 100;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Transform(toNumber({ defaultValue: 1 }))
  GLOBAL_CACHE_TTL = 1;

  @IsOptional()
  @IsString()
  SENTRY_DSN?: string;

  @IsOptional()
  @IsEnum(LogLevel)
  @Transform(({ value }) => value || LogLevel.debug)
  LOG_LEVEL: LogLevel = LogLevel.debug;

  @IsOptional()
  @IsEnum(LogFormat)
  @Transform(({ value }) => value || LogFormat.json)
  LOG_FORMAT: LogFormat = LogFormat.json;

  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @IsUrl(
    {
      require_protocol: true,
    },
    {
      each: true,
    },
  )
  @Transform(toArrayOfUrls)
  PROVIDERS_URLS!: NonEmptyArray<string>;

  @IsNotEmpty()
  @IsInt()
  @Transform(toNumber({ defaultValue: undefined }))
  CHAIN_ID!: number;

  @IsNotEmpty()
  @IsString()
  DB_HOST!: string;

  @IsNotEmpty()
  @IsString()
  DB_USER!: string;

  @IsOptional()
  @IsString()
  DB_PASSWORD?: string;

  @ValidateIf((e) => !e.DB_PASSWORD)
  @IsNotEmpty()
  @IsString()
  DB_PASSWORD_FILE?: string;

  @IsNotEmpty()
  @IsString()
  DB_NAME!: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1025)
  @Max(65535)
  @Transform(toNumber({ defaultValue: undefined }))
  DB_PORT!: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Transform(toNumber({ defaultValue: 100 }))
  PROVIDER_JSON_RPC_MAX_BATCH_SIZE = 100;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Transform(toNumber({ defaultValue: 5 }))
  PROVIDER_CONCURRENT_REQUESTS = 5;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Transform(toNumber({ defaultValue: 10 }))
  PROVIDER_BATCH_AGGREGATION_WAIT_MS = 10;

  // Enable endpoints that use CL API for ejector
  @IsOptional()
  // false turns this instance into a read-only API replica: neither the keys-update nor the
  // validators-update job starts, HTTP behavior does not change. The updaters then run in a
  // separate single-replica worker instance with this flag left on.
  @IsBoolean()
  @Transform(toBoolean({ defaultValue: true }))
  UPDATE_JOBS_ENABLE = true;

  @IsBoolean()
  @Transform(toBoolean({ defaultValue: true }))
  VALIDATOR_REGISTRY_ENABLE = true;

  @ValidateIf((e) => e.VALIDATOR_REGISTRY_ENABLE)
  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @IsUrl(
    {
      require_protocol: true,
    },
    {
      each: true,
    },
  )
  @Transform(toArrayOfUrls)
  CL_API_URLS: string[] = [];

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Transform(toNumber({ defaultValue: 5000 }))
  UPDATE_KEYS_INTERVAL_MS = 5000;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Transform(toNumber({ defaultValue: 10000 }))
  UPDATE_VALIDATORS_INTERVAL_MS = 10000;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Transform(toNumber({ defaultValue: 1100 }))
  KEYS_FETCH_BATCH_SIZE = 1100;

  @IsOptional()
  @IsPositive()
  @Transform(({ value }) => parseInt(value, 10))
  STREAM_TIMEOUT = 60_000;

  @ValidateIf((e) => e.CHAIN_ID !== Chain.Mainnet && e.CHAIN_ID !== Chain.Hoodi)
  @IsNotEmpty()
  @IsString()
  LIDO_LOCATOR_DEVNET_ADDRESS = '';
}

// The logger's replacement token, so masked validation output reads the same as masked logs.
// The redacting logger itself cannot be used here: validation runs while the config it would
// be built from is still being parsed.
const SECRET_REPLACER = '<removed>';
const SECRET_VALUE_KEYS = ['DB_PASSWORD', 'SENTRY_DSN'];
const SECRET_URL_LIST_KEYS = ['PROVIDERS_URLS', 'CL_API_URLS'];

export function maskSecretsInValidationOutput(text: string, config: Record<string, unknown>): string {
  const values = [
    ...SECRET_VALUE_KEYS.map((key) => config[key]),
    ...SECRET_URL_LIST_KEYS.flatMap((key) => String(config[key] ?? '').split(',')).map((url) => url.trim()),
    ...Object.values(SECRETS_IN_FORCE),
  ]
    .map((value) => (value == null ? '' : String(value)))
    .filter((value) => value.length > 0)
    // Longest first, so a value that contains another one is replaced whole.
    .sort((a, b) => b.length - a.length);

  return values.reduce((result, value) => result.split(value).join(SECRET_REPLACER), text);
}

// Decorated fields plus fields with initializers: with target es2017 an uninitialized class
// field does not exist on a fresh instance, so neither source alone lists every key.
export function declaredConfigKeys(): string[] {
  const decorated = getMetadataStorage()
    .getTargetValidationMetadatas(EnvironmentVariables, EnvironmentVariables.name, true, false)
    .map((meta) => meta.propertyName);
  return [...new Set([...decorated, ...Object.getOwnPropertyNames(new EnvironmentVariables())])];
}

// Exposed for the startup dump: the validated instance carries every effective value,
// defaults included, which ConfigService has no way to enumerate.
export let VALIDATED_ENV: Record<string, unknown> | undefined;

export function validate(config: Record<string, unknown>) {
  if (process.env.NODE_ENV == 'test') {
    return config;
  }

  const validatedConfig = plainToInstance(EnvironmentVariables, config);

  const validatorOptions = { skipMissingProperties: false };
  const errors = validateSync(validatedConfig, validatorOptions);

  if (errors.length > 0) {
    console.error(maskSecretsInValidationOutput(errors.toString(), config));
    process.exit(1);
  }

  // Only the declared keys: plainToInstance keeps unknown properties, so the instance itself
  // carries the entire environment — npm_* variables, tokens of whatever launched the process.
  VALIDATED_ENV = Object.fromEntries(
    declaredConfigKeys().map((key) => [key, (validatedConfig as unknown as Record<string, unknown>)[key]]),
  );
  return validatedConfig;
}
