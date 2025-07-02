import { writeFileSync, rmSync } from 'fs';
import { Module } from '@nestjs/common';
import { ConfigModule as ConfigModuleSource } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from 'common/config';

@Module({
  imports: [
    ConfigModuleSource.forRoot({
      ignoreEnvFile: true,
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}

describe('Config module', () => {
  let configService: ConfigService;

  let processEnvCopy: any;
  let errorOutput = '';

  beforeAll(() => {
    processEnvCopy = { ...process.env };

    jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
    jest.spyOn(console, 'error').mockImplementation((...args) => {
      errorOutput += args.join(' ') + '\n';
    });
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
    }).compile();

    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    errorOutput = '';
    process.env = { ...processEnvCopy };
  });

  it('should be defined', () => {
    expect(configService).toBeDefined();
  });

  describe('get method', () => {
    it('should return value of `DB_PASSWORD_FILE` env variable as is', () => {
      process.env.DB_PASSWORD_FILE = undefined;
      expect(configService.get('DB_PASSWORD_FILE')).toBe(undefined);

      process.env.DB_PASSWORD_FILE = '';
      expect(configService.get('DB_PASSWORD_FILE')).toBe('');

      process.env.DB_PASSWORD_FILE = '/path/to/secret.txt';
      expect(configService.get('DB_PASSWORD_FILE')).toBe('/path/to/secret.txt');
    });

    it('should throw error if `DB_PASSWORD` and `DB_PASSWORD_FILE` env variables are not set', () => {
      process.env.DB_PASSWORD = undefined;
      process.env.DB_PASSWORD_FILE = undefined;

      expect(() => configService.get('DB_PASSWORD')).toThrow('process.exit');
      expect(errorOutput).toMatch(/DB_PASSWORD or DB_PASSWORD_FILE environments are not provided\./);
    });

    it('should throw error if `DB_PASSWORD` env variable is not set and `DB_PASSWORD_FILE` is an empty string', () => {
      process.env.DB_PASSWORD = undefined;
      process.env.DB_PASSWORD_FILE = '';

      expect(() => configService.get('DB_PASSWORD')).toThrow('process.exit');
      expect(errorOutput).toMatch(/DB_PASSWORD or DB_PASSWORD_FILE environments are not provided\./);
    });

    it('should read the password from file with the path provided in the `DB_PASSWORD_FILE` env variable, if `DB_PASSWORD_FILE` value is set and `DB_PASSWORD` env variable is not set', () => {
      const path = 'secret.txt';
      process.env.DB_PASSWORD = undefined;
      process.env.DB_PASSWORD_FILE = path;

      writeFileSync(path, 'mypassword');
      expect(configService.get('DB_PASSWORD')).toBe('mypassword');
      rmSync(path);
    });

    it('should throw error if `DB_PASSWORD` is an empty string and `DB_PASSWORD_FILE` env variable is not set', () => {
      process.env.DB_PASSWORD = '';
      process.env.DB_PASSWORD_FILE = undefined;

      expect(() => configService.get('DB_PASSWORD')).toThrow('process.exit');
      expect(errorOutput).toMatch(/DB_PASSWORD or DB_PASSWORD_FILE environments are not provided\./);
    });

    it('should throw error if both `DB_PASSWORD` and `DB_PASSWORD_FILE` are empty strings', () => {
      process.env.DB_PASSWORD = '';
      process.env.DB_PASSWORD_FILE = '';

      expect(() => configService.get('DB_PASSWORD')).toThrow('process.exit');
      expect(errorOutput).toMatch(/DB_PASSWORD or DB_PASSWORD_FILE environments are not provided\./);
    });

    it('should read the password from file with the path provided in the `DB_PASSWORD_FILE` env variable, if `DB_PASSWORD_FILE` value is set and `DB_PASSWORD` is an empty string', () => {
      const path = 'secret.txt';
      process.env.DB_PASSWORD = '';
      process.env.DB_PASSWORD_FILE = path;

      writeFileSync(path, 'mypassword');
      expect(configService.get('DB_PASSWORD')).toBe('mypassword');
      rmSync(path);
    });

    it('should return the value of `DB_PASSWORD` env variable as is if it is specified and ignore any value of `DB_PASSWORD_FILE` env variable', () => {
      process.env.DB_PASSWORD = 'mypassword';

      process.env.DB_PASSWORD_FILE = undefined;
      expect(configService.get('DB_PASSWORD')).toBe('mypassword');

      process.env.DB_PASSWORD_FILE = '';
      expect(configService.get('DB_PASSWORD')).toBe('mypassword');

      process.env.DB_PASSWORD_FILE = '/path/to/secret.txt';
      expect(configService.get('DB_PASSWORD')).toBe('mypassword');
      expect(() => configService.get('DB_PASSWORD')).not.toThrow(
        new Error('Failed to load ENV variable from the DB_PASSWORD_FILE'),
      );
    });
  });
});
