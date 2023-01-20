import { plainToClass, Transform } from 'class-transformer';
import { IsEnum, IsNumber, IsString, IsOptional, validateSync, Min, IsArray, ArrayMinSize } from 'class-validator';
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
  @IsNumber()
  @Min(1)
  @Transform(toNumber({ defaultValue: 3000 }))
  PORT: number;

  @IsOptional()
  @IsString()
  CORS_WHITELIST_REGEXP = '';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(toNumber({ defaultValue: 5 }))
  GLOBAL_THROTTLE_TTL: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(toNumber({ defaultValue: 100 }))
  GLOBAL_THROTTLE_LIMIT: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(toNumber({ defaultValue: 1 }))
  GLOBAL_CACHE_TTL: number;

  @IsOptional()
  @IsString()
  SENTRY_DSN: string | null = null;

  @IsOptional()
  @IsEnum(LogLevel)
  @Transform(({ value }) => value || LogLevel.debug)
  LOG_LEVEL: LogLevel;

  @IsOptional()
  @IsEnum(LogFormat)
  @Transform(({ value }) => value || LogFormat.json)
  LOG_FORMAT: LogFormat;

  @IsArray()
  @ArrayMinSize(1)
  @Transform(({ value }) => value.split(','))
  PROVIDERS_URLS: NonEmptyArray<string>;

  @IsArray()
  @ArrayMinSize(1)
  @Transform(({ value }) => value.split(','))
  CL_API_URLS: string[];

  @IsNumber()
  @Transform(({ value }) => Number(value))
  CHAIN_ID: number;

  @IsString()
  DB_HOST: string;

  @IsString()
  DB_USER: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  DB_NAME: string;

  @IsNumber()
  @Transform(({ value }) => Number(value))
  DB_PORT: number;

  @IsOptional()
  @IsString()
  JOB_INTERVAL_REGISTRY = CronExpression.EVERY_5_SECONDS;

  @IsOptional()
  @IsString()
  JOB_INTERVAL_VALIDATORS_REGISTRY = CronExpression.EVERY_10_SECONDS;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  PROVIDER_JSON_RPC_MAX_BATCH_SIZE = 100;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  PROVIDER_CONCURRENT_REQUESTS = 5;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  PROVIDER_BATCH_AGGREGATION_WAIT_MS = 10;
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
