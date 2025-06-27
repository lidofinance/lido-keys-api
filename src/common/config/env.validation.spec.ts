import { validate } from './env.validation';
import { EnvironmentVariables } from './env.validation';

describe('Environment validation', () => {
  const runValidation = (partial: Partial<Record<keyof EnvironmentVariables, any>>) => {
    return validate(partial as Record<string, unknown>);
  };

  const required_configs = {
    CHAIN_ID: 1,
    PROVIDERS_URLS: 'http://127.0.0.1/',
    DB_PORT: 5432,
    DB_HOST: 'localhost',
    DB_USER: 'postgres',
    DB_PASSWORD: 'postgres',
    DB_NAME: 'test',
    VALIDATOR_REGISTRY_ENABLE: false,
  };

  let errorOutput = '';

  beforeAll(() => {
    // jest by default set NODE_ENV ad test and check if (process.env.NODE_ENV == 'test') { fail this tests
    process.env.NODE_ENV = '';

    jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
    jest.spyOn(console, 'error').mockImplementation((...args) => {
      errorOutput += args.join(' ') + '\n';
    });
  });

  afterEach(() => {
    errorOutput = '';
  });

  describe('NODE_ENV', () => {
    it('should default to development if missing or empty', () => {
      expect(runValidation(required_configs).NODE_ENV).toBe('development');
      expect(runValidation({ ...required_configs, NODE_ENV: '' }).NODE_ENV).toBe('development');
    });

    it('should throw on invalid enum', () => {
      expect(() => runValidation({ ...required_configs, NODE_ENV: 'wrong' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property NODE_ENV has failed the following constraints: isEnum/);
    });

    it('should allow a valid enum', () => {
      expect(runValidation({ ...required_configs, NODE_ENV: 'production' }).NODE_ENV).toBe('production');
    });
  });

  describe('PORT', () => {
    it('should default to 3000 if missing or empty', () => {
      expect(runValidation({ ...required_configs }).PORT).toBe(3000);
      expect(runValidation({ ...required_configs, PORT: '' }).PORT).toBe(3000);
    });

    it('should parse valid number string', () => {
      expect(runValidation({ ...required_configs, PORT: '4000' }).PORT).toBe(4000);
    });

    it('should throw error if invalid value', () => {
      expect(() => runValidation({ ...required_configs, PORT: 'wrong' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property PORT has failed the following constraints: max, min, isInt/);
    });

    it('should fail if below min', () => {
      expect(() => runValidation({ ...required_configs, PORT: '1024' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property PORT has failed the following constraints: min/);
    });

    it('should fail if above max', () => {
      expect(() => runValidation({ ...required_configs, PORT: '70000' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property PORT has failed the following constraints: max/);
    });
  });

  describe('PROVIDERS_URLS', () => {
    it('should throw if missing', () => {
      const { PROVIDERS_URLS, ...test_configs } = required_configs;
      expect(() => runValidation({ ...test_configs })).toThrow('process.exit');
      expect(errorOutput).toMatch(
        /property PROVIDERS_URLS has failed the following constraints: isUrl, arrayMinSize, isArray, isNotEmpty/,
      );
    });

    it('should throw if empty', () => {
      expect(() => runValidation({ ...required_configs, PROVIDERS_URLS: '' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property PROVIDERS_URLS has failed the following constraints: arrayMinSize/);
    });

    it('should parse a single valid URL', () => {
      expect(runValidation({ ...required_configs, PROVIDERS_URLS: 'http://example.com' }).PROVIDERS_URLS).toEqual([
        'http://example.com',
      ]);
    });

    it('should trim trailing slashes and handle comma-separated', () => {
      expect(
        runValidation({ ...required_configs, PROVIDERS_URLS: 'http://one.com/, http://two.com/' }).PROVIDERS_URLS,
      ).toEqual(['http://one.com', 'http://two.com']);

      expect(
        runValidation({ ...required_configs, PROVIDERS_URLS: 'http://one.com/,http://two.com/' }).PROVIDERS_URLS,
      ).toEqual(['http://one.com', 'http://two.com']);

      expect(
        runValidation({ ...required_configs, PROVIDERS_URLS: 'http://one.com,http://two.com' }).PROVIDERS_URLS,
      ).toEqual(['http://one.com', 'http://two.com']);

      expect(
        runValidation({
          ...required_configs,
          PROVIDERS_URLS: '  http://one.com  ,   http://two.com/ ',
        }).PROVIDERS_URLS,
      ).toEqual(['http://one.com', 'http://two.com']);
    });

    it('should throw on wrong URL', () => {
      expect(() => runValidation({ ...required_configs, PROVIDERS_URLS: 'wrongurl' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property PROVIDERS_URLS has failed the following constraints: isUrl/);

      errorOutput = '';
      expect(() => runValidation({ ...required_configs, PROVIDERS_URLS: 'http:/bad-url' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property PROVIDERS_URLS has failed the following constraints: isUrl/);

      errorOutput = '';
      expect(() => runValidation({ ...required_configs, PROVIDERS_URLS: 'http://valid.com,not-a-url' })).toThrow(
        'process.exit',
      );
      expect(errorOutput).toMatch(/property PROVIDERS_URLS has failed the following constraints: isUrl/);
    });

    it('should throw if all URLs are empty after split', () => {
      expect(() => runValidation({ ...required_configs, PROVIDERS_URLS: ',,,,' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property PROVIDERS_URLS has failed the following constraints: isUrl/);
    });

    it('should throw if one of URLs are empty', () => {
      expect(
        () => runValidation({ ...required_configs, PROVIDERS_URLS: 'http://one.com,,http://two.com' }).PROVIDERS_URLS,
      ).toThrow('process.exit');
      expect(errorOutput).toMatch(/property PROVIDERS_URLS has failed the following constraints: isUrl/);
    });

    it('should throw if URL does not have protocol', () => {
      expect(() => runValidation({ ...required_configs, PROVIDERS_URLS: 'example.com' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property PROVIDERS_URLS has failed the following constraints: isUrl/);
    });

    it('should throw if passed JSON string array instead of comma-separated', () => {
      expect(() => runValidation({ ...required_configs, PROVIDERS_URLS: '["http://one.com"]' })).toThrow(
        'process.exit',
      );
      expect(errorOutput).toMatch(/property PROVIDERS_URLS has failed the following constraints: isUrl/);
    });
  });

  describe('CHAIN_ID', () => {
    it('should throw if CHAIN_ID is missing', () => {
      const { CHAIN_ID, ...test_configs } = required_configs;
      expect(() => runValidation({ ...test_configs })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property CHAIN_ID has failed the following constraints: isEnum, isNotEmpty/);
    });

    it('should throw if CHAIN_ID is an empty string', () => {
      expect(() => runValidation({ ...required_configs, CHAIN_ID: '' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property CHAIN_ID has failed the following constraints: isEnum/);
    });

    it('should parse a valid enum value from string', () => {
      expect(runValidation({ ...required_configs, CHAIN_ID: '1' }).CHAIN_ID).toBe(1);
      expect(runValidation({ ...required_configs, CHAIN_ID: '5' }).CHAIN_ID).toBe(5);
      expect(runValidation({ ...required_configs, CHAIN_ID: '17000' }).CHAIN_ID).toBe(17000);
      expect(runValidation({ ...required_configs, CHAIN_ID: '560048' }).CHAIN_ID).toBe(560048);
    });

    it('should throw on non-integer string', () => {
      expect(() => runValidation({ ...required_configs, CHAIN_ID: 'abc' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property CHAIN_ID has failed the following constraints: isEnum/);
    });

    it('should throw if CHAIN_ID is a number not in the Chain enum', () => {
      expect(() => runValidation({ ...required_configs, CHAIN_ID: '999' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property CHAIN_ID has failed the following constraints: isEnum/);
    });
  });

  describe('DB_HOST', () => {
    it('should throw if DB_HOST is missing', () => {
      const { DB_HOST, ...test_configs } = required_configs;
      expect(() => runValidation({ ...test_configs })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property DB_HOST has failed the following constraints: isString, isNotEmpty/);
    });

    it('should throw if DB_HOST is an empty string', () => {
      expect(() => runValidation({ ...required_configs, DB_HOST: '' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property DB_HOST has failed the following constraints: isNotEmpty/);
    });
  });

  describe('DB_USER', () => {
    it('should throw if DB_HOST is missing', () => {
      const { DB_USER, ...test_configs } = required_configs;
      expect(() => runValidation({ ...test_configs })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property DB_USER has failed the following constraints: isString, isNotEmpty/);
    });

    it('should throw if DB_HOST is an empty string', () => {
      expect(() => runValidation({ ...required_configs, DB_USER: '' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property DB_USER has failed the following constraints: isNotEmpty/);
    });
  });

  describe('DB_NAME', () => {
    it('should throw if DB_NAME is missing', () => {
      const { DB_NAME, ...test_configs } = required_configs;
      expect(() => runValidation({ ...test_configs })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property DB_NAME has failed the following constraints: isString, isNotEmpty/);
    });

    it('should throw if DB_NAME is an empty string', () => {
      expect(() => runValidation({ ...required_configs, DB_NAME: '' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property DB_NAME has failed the following constraints: isNotEmpty/);
    });
  });

  describe('DB_PORT', () => {
    it('should throw if DB_PORT is missign', () => {
      const { DB_PORT, ...test_configs } = required_configs;
      expect(() => runValidation({ ...test_configs })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property DB_PORT has failed the following constraints: max, min, isInt, isNotEmpty/);
    });

    it('should throw if DB_PORT is empty', () => {
      expect(() => runValidation({ ...required_configs, DB_PORT: '' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property DB_PORT has failed the following constraints: max, min, isInt/);
    });

    it('should parse valid number string', () => {
      expect(runValidation({ ...required_configs, DB_PORT: '4000' }).DB_PORT).toBe(4000);
    });

    it('should throw error if invalid value', () => {
      expect(() => runValidation({ ...required_configs, DB_PORT: 'wrong' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property DB_PORT has failed the following constraints: max, min, isInt/);
    });

    it('should fail if below min', () => {
      expect(() => runValidation({ ...required_configs, DB_PORT: '1024' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property DB_PORT has failed the following constraints: min/);
    });

    it('should fail if above max', () => {
      expect(() => runValidation({ ...required_configs, DB_PORT: '65536' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property DB_PORT has failed the following constraints: max/);
    });
  });

  describe('PROVIDER_JSON_RPC_MAX_BATCH_SIZE', () => {
    it('should set default value if PROVIDER_JSON_RPC_MAX_BATCH_SIZE is missing', () => {
      expect(runValidation({ ...required_configs }).PROVIDER_JSON_RPC_MAX_BATCH_SIZE).toBe(100);
    });

    it('should set default value if PROVIDER_JSON_RPC_MAX_BATCH_SIZE is empty', () => {
      expect(
        runValidation({ ...required_configs, PROVIDER_JSON_RPC_MAX_BATCH_SIZE: '' }).PROVIDER_JSON_RPC_MAX_BATCH_SIZE,
      ).toBe(100);
    });

    it('should parse valid number string', () => {
      expect(
        runValidation({ ...required_configs, PROVIDER_JSON_RPC_MAX_BATCH_SIZE: '250' })
          .PROVIDER_JSON_RPC_MAX_BATCH_SIZE,
      ).toBe(250);
    });

    it('should accept a positive integer number directly', () => {
      expect(
        runValidation({ ...required_configs, PROVIDER_JSON_RPC_MAX_BATCH_SIZE: 300 }).PROVIDER_JSON_RPC_MAX_BATCH_SIZE,
      ).toBe(300);
    });

    it('should throw if value is zero', () => {
      expect(() => runValidation({ ...required_configs, PROVIDER_JSON_RPC_MAX_BATCH_SIZE: '0' })).toThrow(
        'process.exit',
      );
      expect(errorOutput).toMatch(
        /property PROVIDER_JSON_RPC_MAX_BATCH_SIZE has failed the following constraints: isPositive/,
      );
    });

    it('should throw if value is negative', () => {
      expect(() => runValidation({ ...required_configs, PROVIDER_JSON_RPC_MAX_BATCH_SIZE: '-5' })).toThrow(
        'process.exit',
      );
      expect(errorOutput).toMatch(
        /property PROVIDER_JSON_RPC_MAX_BATCH_SIZE has failed the following constraints: isPositive/,
      );
    });

    it('should throw if value is not an integer', () => {
      expect(() => runValidation({ ...required_configs, PROVIDER_JSON_RPC_MAX_BATCH_SIZE: '10.5' })).toThrow(
        'process.exit',
      );
      expect(errorOutput).toMatch(
        /property PROVIDER_JSON_RPC_MAX_BATCH_SIZE has failed the following constraints: isInt/,
      );
    });

    it('should throw if value is a non-numeric string', () => {
      expect(() => runValidation({ ...required_configs, PROVIDER_JSON_RPC_MAX_BATCH_SIZE: 'wrong' })).toThrow(
        'process.exit',
      );
      expect(errorOutput).toMatch(
        /property PROVIDER_JSON_RPC_MAX_BATCH_SIZE has failed the following constraints: isPositive, isInt/,
      );
    });
  });

  describe('PROVIDER_CONCURRENT_REQUESTS', () => {
    it('should set default value if PROVIDER_CONCURRENT_REQUESTS is missing', () => {
      expect(runValidation({ ...required_configs }).PROVIDER_CONCURRENT_REQUESTS).toBe(5);
    });

    it('should set default value if PROVIDER_CONCURRENT_REQUESTS is empty', () => {
      expect(
        runValidation({ ...required_configs, PROVIDER_CONCURRENT_REQUESTS: '' }).PROVIDER_CONCURRENT_REQUESTS,
      ).toBe(5);
    });

    it('should parse valid number string', () => {
      expect(
        runValidation({ ...required_configs, PROVIDER_CONCURRENT_REQUESTS: '12' }).PROVIDER_CONCURRENT_REQUESTS,
      ).toBe(12);
    });

    it('should accept a positive integer number directly', () => {
      expect(
        runValidation({ ...required_configs, PROVIDER_CONCURRENT_REQUESTS: 20 }).PROVIDER_CONCURRENT_REQUESTS,
      ).toBe(20);
    });

    it('should throw if value is zero', () => {
      expect(() => runValidation({ ...required_configs, PROVIDER_CONCURRENT_REQUESTS: '0' })).toThrow('process.exit');
      expect(errorOutput).toMatch(
        /property PROVIDER_CONCURRENT_REQUESTS has failed the following constraints: isPositive/,
      );
    });

    it('should throw if value is negative', () => {
      expect(() => runValidation({ ...required_configs, PROVIDER_CONCURRENT_REQUESTS: '-3' })).toThrow('process.exit');
      expect(errorOutput).toMatch(
        /property PROVIDER_CONCURRENT_REQUESTS has failed the following constraints: isPositive/,
      );
    });

    it('should throw if value is not an integer', () => {
      expect(() => runValidation({ ...required_configs, PROVIDER_CONCURRENT_REQUESTS: '2.5' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property PROVIDER_CONCURRENT_REQUESTS has failed the following constraints: isInt/);
    });

    it('should throw if value is a non-numeric string', () => {
      expect(() => runValidation({ ...required_configs, PROVIDER_CONCURRENT_REQUESTS: 'wrong' })).toThrow(
        'process.exit',
      );
      expect(errorOutput).toMatch(
        /property PROVIDER_CONCURRENT_REQUESTS has failed the following constraints: isPositive, isInt/,
      );
    });
  });

  describe('PROVIDER_BATCH_AGGREGATION_WAIT_MS', () => {
    it('should set default value if PROVIDER_BATCH_AGGREGATION_WAIT_MS is missing', () => {
      expect(runValidation({ ...required_configs }).PROVIDER_BATCH_AGGREGATION_WAIT_MS).toBe(10);
    });

    it('should set default value if PROVIDER_BATCH_AGGREGATION_WAIT_MS is empty', () => {
      expect(
        runValidation({ ...required_configs, PROVIDER_BATCH_AGGREGATION_WAIT_MS: '' })
          .PROVIDER_BATCH_AGGREGATION_WAIT_MS,
      ).toBe(10);
    });

    it('should parse valid number string', () => {
      expect(
        runValidation({ ...required_configs, PROVIDER_BATCH_AGGREGATION_WAIT_MS: '50' })
          .PROVIDER_BATCH_AGGREGATION_WAIT_MS,
      ).toBe(50);
    });

    it('should accept a positive integer number directly', () => {
      expect(
        runValidation({ ...required_configs, PROVIDER_BATCH_AGGREGATION_WAIT_MS: 100 })
          .PROVIDER_BATCH_AGGREGATION_WAIT_MS,
      ).toBe(100);
    });

    it('should throw if value is zero', () => {
      expect(() => runValidation({ ...required_configs, PROVIDER_BATCH_AGGREGATION_WAIT_MS: '0' })).toThrow(
        'process.exit',
      );
      expect(errorOutput).toMatch(
        /property PROVIDER_BATCH_AGGREGATION_WAIT_MS has failed the following constraints: isPositive/,
      );
    });

    it('should throw if value is negative', () => {
      expect(() => runValidation({ ...required_configs, PROVIDER_BATCH_AGGREGATION_WAIT_MS: '-5' })).toThrow(
        'process.exit',
      );
      expect(errorOutput).toMatch(
        /property PROVIDER_BATCH_AGGREGATION_WAIT_MS has failed the following constraints: isPositive/,
      );
    });

    it('should throw if value is not an integer', () => {
      expect(() => runValidation({ ...required_configs, PROVIDER_BATCH_AGGREGATION_WAIT_MS: '1.5' })).toThrow(
        'process.exit',
      );
      expect(errorOutput).toMatch(
        /property PROVIDER_BATCH_AGGREGATION_WAIT_MS has failed the following constraints: isInt/,
      );
    });

    it('should throw if value is a non-numeric string', () => {
      expect(() => runValidation({ ...required_configs, PROVIDER_BATCH_AGGREGATION_WAIT_MS: 'oops' })).toThrow(
        'process.exit',
      );
      expect(errorOutput).toMatch(
        /property PROVIDER_BATCH_AGGREGATION_WAIT_MS has failed the following constraints: isPositive, isInt/,
      );
    });
  });

  describe('DB_PASSWORD and DB_PASSWORD_FILE', () => {
    it('should pass with valid DB_PASSWORD only', () => {
      const result = runValidation({ ...required_configs, DB_PASSWORD_FILE: '/path/to/secret.txt' });
      expect(result.DB_PASSWORD).toBe('postgres');
      expect(result.DB_PASSWORD_FILE).toBe('/path/to/secret.txt');
    });

    it('should pass with valid DB_PASSWORD_FILE only', () => {
      const { DB_PASSWORD, ...test_configs } = required_configs;
      const config = {
        ...test_configs,
        DB_PASSWORD_FILE: '/path/to/secret.txt',
      };

      expect(runValidation(config).DB_PASSWORD_FILE).toBe('/path/to/secret.txt');
    });

    it('should throw error with valid DB_PASSWORD_FILE and empty DB_PASSWORD', () => {
      expect(
        () =>
          runValidation({ ...required_configs, DB_PASSWORD: '', DB_PASSWORD_FILE: '/path/to/secret.txt' })
            .DB_PASSWORD_FILE,
      ).toThrow('process.exit');
      expect(errorOutput).toMatch(/property DB_PASSWORD has failed the following constraints: isNotEmpty/);
    });

    it('should throw if both DB_PASSWORD and DB_PASSWORD_FILE are missing', () => {
      const { DB_PASSWORD, ...test_configs } = required_configs;

      expect(() => runValidation(test_configs)).toThrow('process.exit');
      expect(errorOutput).toMatch(
        /property DB_PASSWORD_FILE has failed the following constraints: isNotEmpty, isString/,
      );
    });

    it('should throw if DB_PASSWORD is empty and DB_PASSWORD_FILE is missing', () => {
      const config = {
        ...required_configs,
        DB_PASSWORD: '',
      };

      expect(() => runValidation(config)).toThrow('process.exit');
      expect(errorOutput).toMatch(/property DB_PASSWORD has failed the following constraints: isNotEmpty/);
      expect(errorOutput).toMatch(/property DB_PASSWORD_FILE has failed the following constraints: isNotEmpty/);
    });

    it('should throw if DB_PASSWORD is empty and DB_PASSWORD_FILE is empty', () => {
      const config = {
        ...required_configs,
        DB_PASSWORD: '',
        DB_PASSWORD_FILE: '',
      };

      expect(() => runValidation(config)).toThrow('process.exit');
      expect(errorOutput).toMatch(/property DB_PASSWORD has failed the following constraints: isNotEmpty/);
      expect(errorOutput).toMatch(/property DB_PASSWORD_FILE has failed the following constraints: isNotEmpty/);
    });
  });

  describe('UPDATE_KEYS_INTERVAL_MS', () => {
    it('should set default value if UPDATE_KEYS_INTERVAL_MS is missing', () => {
      expect(runValidation({ ...required_configs }).UPDATE_KEYS_INTERVAL_MS).toBe(5000);
    });

    it('should set default value if UPDATE_KEYS_INTERVAL_MS is empty', () => {
      expect(runValidation({ ...required_configs, UPDATE_KEYS_INTERVAL_MS: '' }).UPDATE_KEYS_INTERVAL_MS).toBe(5000);
    });

    it('should parse valid number string', () => {
      expect(runValidation({ ...required_configs, UPDATE_KEYS_INTERVAL_MS: '7000' }).UPDATE_KEYS_INTERVAL_MS).toBe(
        7000,
      );
    });

    it('should accept a positive integer number directly', () => {
      expect(runValidation({ ...required_configs, UPDATE_KEYS_INTERVAL_MS: 8000 }).UPDATE_KEYS_INTERVAL_MS).toBe(8000);
    });

    it('should throw if value is zero', () => {
      expect(() => runValidation({ ...required_configs, UPDATE_KEYS_INTERVAL_MS: '0' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property UPDATE_KEYS_INTERVAL_MS has failed the following constraints: isPositive/);
    });

    it('should throw if value is negative', () => {
      expect(() => runValidation({ ...required_configs, UPDATE_KEYS_INTERVAL_MS: '-100' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property UPDATE_KEYS_INTERVAL_MS has failed the following constraints: isPositive/);
    });

    it('should throw if value is not an integer', () => {
      expect(() => runValidation({ ...required_configs, UPDATE_KEYS_INTERVAL_MS: '12.5' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property UPDATE_KEYS_INTERVAL_MS has failed the following constraints: isInt/);
    });

    it('should throw if value is a non-numeric string', () => {
      expect(() => runValidation({ ...required_configs, UPDATE_KEYS_INTERVAL_MS: 'wrong' })).toThrow('process.exit');
      expect(errorOutput).toMatch(
        /property UPDATE_KEYS_INTERVAL_MS has failed the following constraints: isPositive, isInt/,
      );
    });
  });

  describe('UPDATE_VALIDATORS_INTERVAL_MS', () => {
    it('should set default value if UPDATE_VALIDATORS_INTERVAL_MS is missing', () => {
      expect(runValidation({ ...required_configs }).UPDATE_VALIDATORS_INTERVAL_MS).toBe(10000);
    });

    it('should set default value if UPDATE_VALIDATORS_INTERVAL_MS is empty', () => {
      expect(
        runValidation({ ...required_configs, UPDATE_VALIDATORS_INTERVAL_MS: '' }).UPDATE_VALIDATORS_INTERVAL_MS,
      ).toBe(10000);
    });

    it('should parse valid number string', () => {
      expect(
        runValidation({ ...required_configs, UPDATE_VALIDATORS_INTERVAL_MS: '15000' }).UPDATE_VALIDATORS_INTERVAL_MS,
      ).toBe(15000);
    });

    it('should accept a positive integer number directly', () => {
      expect(
        runValidation({ ...required_configs, UPDATE_VALIDATORS_INTERVAL_MS: 20000 }).UPDATE_VALIDATORS_INTERVAL_MS,
      ).toBe(20000);
    });

    it('should throw if value is zero', () => {
      expect(() => runValidation({ ...required_configs, UPDATE_VALIDATORS_INTERVAL_MS: '0' })).toThrow('process.exit');
      expect(errorOutput).toMatch(
        /property UPDATE_VALIDATORS_INTERVAL_MS has failed the following constraints: isPositive/,
      );
    });

    it('should throw if value is negative', () => {
      expect(() => runValidation({ ...required_configs, UPDATE_VALIDATORS_INTERVAL_MS: '-1000' })).toThrow(
        'process.exit',
      );
      expect(errorOutput).toMatch(
        /property UPDATE_VALIDATORS_INTERVAL_MS has failed the following constraints: isPositive/,
      );
    });

    it('should throw if value is not an integer', () => {
      expect(() => runValidation({ ...required_configs, UPDATE_VALIDATORS_INTERVAL_MS: '1.1' })).toThrow(
        'process.exit',
      );
      expect(errorOutput).toMatch(/property UPDATE_VALIDATORS_INTERVAL_MS has failed the following constraints: isInt/);
    });

    it('should throw if value is a non-numeric string', () => {
      expect(() => runValidation({ ...required_configs, UPDATE_VALIDATORS_INTERVAL_MS: 'wrong' })).toThrow(
        'process.exit',
      );
      expect(errorOutput).toMatch(
        /property UPDATE_VALIDATORS_INTERVAL_MS has failed the following constraints: isPositive, isInt/,
      );
    });
  });

  describe('KEYS_FETCH_BATCH_SIZE', () => {
    it('should set default value if KEYS_FETCH_BATCH_SIZE is missing', () => {
      expect(runValidation({ ...required_configs }).KEYS_FETCH_BATCH_SIZE).toBe(1100);
    });

    it('should set default value if KEYS_FETCH_BATCH_SIZE is empty', () => {
      expect(runValidation({ ...required_configs, KEYS_FETCH_BATCH_SIZE: '' }).KEYS_FETCH_BATCH_SIZE).toBe(1100);
    });

    it('should parse valid number string', () => {
      expect(runValidation({ ...required_configs, KEYS_FETCH_BATCH_SIZE: '1300' }).KEYS_FETCH_BATCH_SIZE).toBe(1300);
    });

    it('should accept a positive integer number directly', () => {
      expect(runValidation({ ...required_configs, KEYS_FETCH_BATCH_SIZE: 1500 }).KEYS_FETCH_BATCH_SIZE).toBe(1500);
    });

    it('should throw if value is zero', () => {
      expect(() => runValidation({ ...required_configs, KEYS_FETCH_BATCH_SIZE: '0' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property KEYS_FETCH_BATCH_SIZE has failed the following constraints: isPositive/);
    });

    it('should throw if value is negative', () => {
      expect(() => runValidation({ ...required_configs, KEYS_FETCH_BATCH_SIZE: '-10' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property KEYS_FETCH_BATCH_SIZE has failed the following constraints: isPositive/);
    });

    it('should throw if value is not an integer', () => {
      expect(() => runValidation({ ...required_configs, KEYS_FETCH_BATCH_SIZE: '200.5' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property KEYS_FETCH_BATCH_SIZE has failed the following constraints: isInt/);
    });

    it('should throw if value is a non-numeric string', () => {
      expect(() => runValidation({ ...required_configs, KEYS_FETCH_BATCH_SIZE: 'wrong' })).toThrow('process.exit');
      expect(errorOutput).toMatch(
        /property KEYS_FETCH_BATCH_SIZE has failed the following constraints: isPositive, isInt/,
      );
    });
  });

  describe('VALIDATOR_REGISTRY_ENABLE', () => {
    it('should default to true if missing', () => {
      const { VALIDATOR_REGISTRY_ENABLE, ...test_configs } = required_configs;
      expect(runValidation({ ...test_configs, CL_API_URLS: 'http://test.com' }).VALIDATOR_REGISTRY_ENABLE).toBe(true);
    });

    it('should default to true if empty string', () => {
      expect(
        runValidation({ ...required_configs, VALIDATOR_REGISTRY_ENABLE: '', CL_API_URLS: 'http://test.com' })
          .VALIDATOR_REGISTRY_ENABLE,
      ).toBe(true);
    });

    it('should parse string "true" to true', () => {
      expect(
        runValidation({ ...required_configs, VALIDATOR_REGISTRY_ENABLE: 'true', CL_API_URLS: 'http://test.com' })
          .VALIDATOR_REGISTRY_ENABLE,
      ).toBe(true);
    });

    it('should parse string "false" to false', () => {
      expect(runValidation({ ...required_configs, VALIDATOR_REGISTRY_ENABLE: 'false' }).VALIDATOR_REGISTRY_ENABLE).toBe(
        false,
      );
    });

    it('should parse string "yes" to true', () => {
      expect(
        runValidation({ ...required_configs, VALIDATOR_REGISTRY_ENABLE: 'yes', CL_API_URLS: 'http://test.com' })
          .VALIDATOR_REGISTRY_ENABLE,
      ).toBe(true);
    });

    it('should parse string "no" to false', () => {
      expect(runValidation({ ...required_configs, VALIDATOR_REGISTRY_ENABLE: 'no' }).VALIDATOR_REGISTRY_ENABLE).toBe(
        false,
      );
    });

    it('should parse string "1" to true', () => {
      expect(
        runValidation({ ...required_configs, VALIDATOR_REGISTRY_ENABLE: '1', CL_API_URLS: 'http://test.com' })
          .VALIDATOR_REGISTRY_ENABLE,
      ).toBe(true);
    });

    it('should parse string "0" to false', () => {
      expect(runValidation({ ...required_configs, VALIDATOR_REGISTRY_ENABLE: '0' }).VALIDATOR_REGISTRY_ENABLE).toBe(
        false,
      );
    });

    it('should accept boolean true directly', () => {
      expect(
        runValidation({ ...required_configs, VALIDATOR_REGISTRY_ENABLE: true, CL_API_URLS: 'http://test.com' })
          .VALIDATOR_REGISTRY_ENABLE,
      ).toBe(true);
    });

    it('should accept boolean false directly', () => {
      expect(runValidation({ ...required_configs, VALIDATOR_REGISTRY_ENABLE: false }).VALIDATOR_REGISTRY_ENABLE).toBe(
        false,
      );
    });

    it('should throw on unexpected non-boolean string like "banana"', () => {
      expect(() => runValidation({ ...required_configs, VALIDATOR_REGISTRY_ENABLE: 'banana' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property VALIDATOR_REGISTRY_ENABLE has failed the following constraints: isBoolean/);
    });

    it('should throw on unexpected numeric string like "123"', () => {
      expect(() => runValidation({ ...required_configs, VALIDATOR_REGISTRY_ENABLE: '123' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property VALIDATOR_REGISTRY_ENABLE has failed the following constraints: isBoolean/);
    });
  });

  describe('CL_API_URLS', () => {
    const config = { ...required_configs, VALIDATOR_REGISTRY_ENABLE: true };
    it('should throw if CL_API_URLS is missing and VALIDATOR_REGISTRY_ENABLE is true', () => {
      expect(() => runValidation(config)).toThrow('process.exit');
      expect(errorOutput).toMatch(/property CL_API_URLS has failed the following constraints: arrayMinSize/);
    });

    it('should throw if CL_API_URLS is an empty string', () => {
      expect(() => runValidation({ ...config, CL_API_URLS: '' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property CL_API_URLS has failed the following constraints: arrayMinSize/);
    });

    it('should parse a single valid URL', () => {
      expect(runValidation({ ...config, CL_API_URLS: 'http://example.com' }).CL_API_URLS).toEqual([
        'http://example.com',
      ]);
    });

    it('should trim and parse comma-separated URLs', () => {
      expect(runValidation({ ...config, CL_API_URLS: 'http://one.com/, http://two.com/' }).CL_API_URLS).toEqual([
        'http://one.com',
        'http://two.com',
      ]);

      expect(runValidation({ ...config, CL_API_URLS: 'http://one.com/,http://two.com/' }).CL_API_URLS).toEqual([
        'http://one.com',
        'http://two.com',
      ]);

      expect(runValidation({ ...config, CL_API_URLS: 'http://one.com,http://two.com' }).CL_API_URLS).toEqual([
        'http://one.com',
        'http://two.com',
      ]);

      expect(runValidation({ ...config, CL_API_URLS: '  http://one.com  ,   http://two.com/ ' }).CL_API_URLS).toEqual([
        'http://one.com',
        'http://two.com',
      ]);
    });

    it('should throw on malformed URL', () => {
      expect(() => runValidation({ ...config, CL_API_URLS: 'wrongurl' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property CL_API_URLS has failed the following constraints: isUrl/);

      errorOutput = '';
      expect(() => runValidation({ ...config, CL_API_URLS: 'http:/bad-url' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property CL_API_URLS has failed the following constraints: isUrl/);

      errorOutput = '';
      expect(() => runValidation({ ...config, CL_API_URLS: 'http://valid.com,not-a-url' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property CL_API_URLS has failed the following constraints: isUrl/);
    });

    it('should throw if all values are empty after splitting', () => {
      expect(() => runValidation({ ...config, CL_API_URLS: ',,,,' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property CL_API_URLS has failed the following constraints: isUrl/);
    });

    it('should throw if one of the URLs is empty in the middle', () => {
      expect(() => runValidation({ ...config, CL_API_URLS: 'http://one.com,,http://two.com' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property CL_API_URLS has failed the following constraints: isUrl/);
    });

    it('should throw if a URL does not include protocol', () => {
      expect(() => runValidation({ ...config, CL_API_URLS: 'example.com' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property CL_API_URLS has failed the following constraints: isUrl/);
    });

    it('should throw if CL_API_URLS is a JSON array string instead of comma-separated', () => {
      expect(() => runValidation({ ...config, CL_API_URLS: '["http://one.com"]' })).toThrow('process.exit');
      expect(errorOutput).toMatch(/property CL_API_URLS has failed the following constraints: isUrl/);
    });

    it('should skip CL_API_URLS validation if VALIDATOR_REGISTRY_ENABLE is false', () => {
      expect(() => runValidation(required_configs)).not.toThrow();
      expect(runValidation(required_configs).VALIDATOR_REGISTRY_ENABLE).toBe(false);
    });
  });
});
