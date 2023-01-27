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
} from 'class-validator';
import { Environment, LogLevel, LogFormat } from './interfaces';
import { NonEmptyArray } from '@lido-nestjs/execution/dist/interfaces/non-empty-array';
import { CronExpression } from '@nestjs/schedule';

const toNumber =
  ({ defaultValue }) =>
  ({ value }) => {
    if (value === '' || value == null || value == undefined) return defaultValue;
    return Number(value);
  };

export class EnvironmentVariables {
  @IsOptional()
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.development;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(toNumber({ defaultValue: 3000 }))
  PORT: number = 3000;

  @IsOptional()
  @IsString()
  CORS_WHITELIST_REGEXP = '';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(toNumber({ defaultValue: 5 }))
  GLOBAL_THROTTLE_TTL: number = 5;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(toNumber({ defaultValue: 100 }))
  GLOBAL_THROTTLE_LIMIT: number = 100;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(toNumber({ defaultValue: 1 }))
  GLOBAL_CACHE_TTL: number = 1;

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
  @Transform(({ value }) => value.split(','))
  PROVIDERS_URLS!: NonEmptyArray<string>;

  @IsArray()
  @ArrayMinSize(1)
  @Transform(({ value }) => value.split(','))
  CL_API_URLS!: string[];

  @IsInt()
  @Transform(({ value }) => parseInt(value, 10))
  CHAIN_ID!: number;

  @IsString()
  DB_HOST!: string;

  @IsString()
  DB_USER!: string;

  @IsString()
  DB_PASSWORD!: string;

  @IsString()
  DB_NAME!: string;

  @IsInt()
  @Transform(({ value }) => parseInt(value, 10))
  DB_PORT!: number;

  @IsOptional()
  @IsString()
  JOB_INTERVAL_REGISTRY = CronExpression.EVERY_5_SECONDS;

  @IsOptional()
  @IsString()
  JOB_INTERVAL_VALIDATORS_REGISTRY = CronExpression.EVERY_10_SECONDS;

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
  VALIDATOR_REGISTRY_ENABLE = true;

  // Enable fetching unused keys
  @IsOptional()
  @IsBoolean()
  FETCHING_UNUSED_KEYS_ENABLE = true;
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
