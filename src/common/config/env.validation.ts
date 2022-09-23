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
  @Transform(({ value }) => value || LogLevel.info)
  LOG_LEVEL: LogLevel;

  @IsOptional()
  @IsEnum(LogFormat)
  @Transform(({ value }) => value || LogFormat.json)
  LOG_FORMAT: LogFormat;

  @IsArray()
  @ArrayMinSize(1)
  @Transform(({ value }) => value.split(','))
  PROVIDERS_URLS: NonEmptyArray<string>;

  @IsNumber()
  @Transform(({ value }) => Number(value))
  CHAIN_ID: number;

  @IsString()
  DB_HOST: string;

  @IsString()
  DB_USERNAME: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  DB_NAME: string;

  @IsNumber()
  @Transform(({ value }) => Number(value))
  DB_PORT: number;

  @IsString()
  DB_MIGRATIONS_TABLE_NAME;

  @IsOptional()
  @IsString()
  JOB_INTERVAL_REGISTRY = CronExpression.EVERY_MINUTE;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config);

  const validatorOptions = { skipMissingProperties: false };
  const errors = validateSync(validatedConfig, validatorOptions);

  if (errors.length > 0) {
    console.error(errors.toString());
    process.exit(1);
  }

  return validatedConfig;
}
