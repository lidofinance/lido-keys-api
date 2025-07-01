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
} from 'class-validator';
import { Environment, LogLevel, LogFormat, Chain } from './interfaces';
import { NonEmptyArray } from '@lido-nestjs/execution/dist/interfaces/non-empty-array';

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
  @IsEnum(Chain)
  @Transform(toNumber({ defaultValue: undefined }))
  CHAIN_ID!: Chain;

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
}

export function validate(config: Record<string, unknown>) {
  if (process.env.NODE_ENV == 'test') {
    return config;
  }

  const validatedConfig = plainToInstance(EnvironmentVariables, config);

  const validatorOptions = { skipMissingProperties: false };
  const errors = validateSync(validatedConfig, validatorOptions);

  if (errors.length > 0) {
    console.error(errors.toString());
    process.exit(1);
  }

  return validatedConfig;
}
