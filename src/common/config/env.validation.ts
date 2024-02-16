import { plainToClass, Transform } from 'class-transformer';
import {
  IsEnum,
  IsString,
  IsOptional,
  validateSync,
  Min,
  IsArray,
  ArrayMinSize,
  IsInt,
  IsBoolean,
  ValidateIf,
  IsNotEmpty,
  IsPositive,
} from 'class-validator';
import { Environment, LogLevel, LogFormat } from './interfaces';
import { NonEmptyArray } from '@lido-nestjs/execution/dist/interfaces/non-empty-array';

const toNumber =
  ({ defaultValue }) =>
  ({ value }) => {
    if (value === '' || value == null || value == undefined) return defaultValue;
    return Number(value);
  };

export const toBoolean = (value: any): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return !!value;
  }

  if (!(typeof value === 'string')) {
    return false;
  }

  switch (value.toLowerCase().trim()) {
    case 'true':
    case 'yes':
    case '1':
      return true;
    case 'false':
    case 'no':
    case '0':
    case null:
      return false;
    default:
      return false;
  }
};

export class EnvironmentVariables {
  @IsOptional()
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.development;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(toNumber({ defaultValue: 3000 }))
  PORT = 3000;

  @IsOptional()
  @IsString()
  CORS_WHITELIST_REGEXP = '';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(toNumber({ defaultValue: 5 }))
  GLOBAL_THROTTLE_TTL = 5;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(toNumber({ defaultValue: 100 }))
  GLOBAL_THROTTLE_LIMIT = 100;

  @IsOptional()
  @IsInt()
  @Min(1)
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

  @IsArray()
  @ArrayMinSize(1)
  @Transform(({ value }) => value.split(',').map((url) => url.replace(/\/$/, '')))
  PROVIDERS_URLS!: NonEmptyArray<string>;

  @IsInt()
  @Transform(({ value }) => parseInt(value, 10))
  CHAIN_ID!: number;

  @IsString()
  DB_HOST!: string;

  @IsString()
  DB_USER!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  DB_PASSWORD!: string;

  @ValidateIf((e) => !e.DB_PASSWORD)
  @IsString()
  @IsNotEmpty()
  DB_PASSWORD_FILE!: string;

  @IsString()
  DB_NAME!: string;

  @IsInt()
  @Transform(({ value }) => parseInt(value, 10))
  DB_PORT!: number;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value, 10))
  PROVIDER_JSON_RPC_MAX_BATCH_SIZE = 100;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value, 10))
  PROVIDER_CONCURRENT_REQUESTS = 5;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value, 10))
  PROVIDER_BATCH_AGGREGATION_WAIT_MS = 10;

  // Enable endpoints that use CL API for ejector
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toBoolean(value))
  VALIDATOR_REGISTRY_ENABLE = true;

  @ValidateIf((e) => e.VALIDATOR_REGISTRY_ENABLE === true)
  @IsArray()
  @ArrayMinSize(1)
  @Transform(({ value }) => value.split(',').map((url) => url.replace(/\/$/, '')))
  CL_API_URLS: string[] = [];

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value, 10))
  UPDATE_KEYS_INTERVAL_MS = 5000;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value, 10))
  UPDATE_VALIDATORS_INTERVAL_MS = 10000;

  @IsOptional()
  @IsPositive()
  @Transform(({ value }) => parseInt(value, 10))
  KEYS_FETCH_BATCH_SIZE = 1100;

  @IsOptional()
  @IsPositive()
  @Transform(({ value }) => parseInt(value, 10))
  STREAM_TIMEOUT = 60_000;
}

export function validate(config: Record<string, unknown>) {
  if (process.env.NODE_ENV == 'test') {
    return config;
  }

  const validatedConfig = plainToClass(EnvironmentVariables, config);

  const validatorOptions = { skipMissingProperties: false };
  const errors = validateSync(validatedConfig, validatorOptions);

  if (errors.length > 0) {
    console.error(errors.toString());
    process.exit(1);
  }

  return validatedConfig;
}
