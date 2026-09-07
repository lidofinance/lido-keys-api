// First: the imports below read process.env while they load.
import { SECRETS_FILE_PATH, SECRETS_IN_FORCE, SECRETS_POLL_INTERVAL_IN_SECONDS } from './common/secrets/bootstrap-env';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { SWAGGER_URL } from './http/common/swagger';
import { ConfigService, VALIDATED_ENV } from './common/config';
import { AppModule, APP_DESCRIPTION, APP_NAME, APP_VERSION } from './app';
import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/knex';
import { PrometheusService } from './common/prometheus';
import { SecretsWatcher, secretsFileMtimeMs } from './common/secrets';

export const validationOpt = { transform: true };

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      trustProxy: true,
      ignoreTrailingSlash: true,
      forceCloseConnections: true,
    }),
    {
      bufferLogs: true,
    },
  );

  // config
  const configService: ConfigService = app.get(ConfigService);
  const environment = configService.get('NODE_ENV');
  const appPort = configService.get('PORT');
  const corsWhitelist = configService.get('CORS_WHITELIST_REGEXP');
  const sentryDsn = configService.get('SENTRY_DSN') ?? undefined;

  // Several instances boot concurrently (API replicas and the worker) and each runs the
  // migrator: on a fresh database two concurrent `create table` race into a pg_type unique
  // violation. The lock serializes them; the losers find the migrations already applied.
  const orm = app.get(MikroORM);
  await orm.em.transactional(async (em) => {
    await (em as EntityManager).execute("select pg_advisory_xact_lock(hashtext('lido-keys-api:migrations'))");
    await orm.getMigrator().up();
  });

  // versions
  app.enableVersioning({ type: VersioningType.URI });

  // logger
  const logger: Logger = app.get(LOGGER_PROVIDER);
  app.useLogger(logger);

  const fromFile = Object.keys(SECRETS_IN_FORCE).length > 0;
  logger.log(
    fromFile
      ? `Configuration: ${SECRETS_FILE_PATH} over the environment`
      : `Configuration: the environment (no secrets file at ${SECRETS_FILE_PATH})`,
  );
  // Defaults included, unlike a dump of process.env. The logger's secrets format masks
  // every value from configService.secrets in this line.
  logger.log(`Effective configuration: ${JSON.stringify(VALIDATED_ENV)}`);

  const prometheusService = app.get(PrometheusService);
  prometheusService.secretsFileMtime.set(fromFile ? (secretsFileMtimeMs(SECRETS_FILE_PATH) ?? 0) / 1000 : 0);

  // Not enableShutdownHooks: it leaves the process to exit on its own, and dependencies hold
  // timers that outlive the application. close() still runs the destroy hooks.
  let shuttingDown = false;
  const shutdown = async (reason: string, code: number) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.log(`Shutting down: ${reason}`);

    const deadline = setTimeout(() => {
      logger.error(`Shutdown did not finish within ${SHUTDOWN_TIMEOUT_MS} ms, exiting anyway`);
      process.exit(code);
    }, SHUTDOWN_TIMEOUT_MS);

    try {
      await app.close();
    } catch (error) {
      logger.error(error);
    }
    clearTimeout(deadline);
    process.exit(code);
  };

  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => void shutdown(signal, 0));
  }

  // Exit rather than swap clients in a live process: the supervisor restarts it with the new values.
  if (fromFile) {
    new SecretsWatcher(SECRETS_FILE_PATH, {
      intervalInSeconds: SECRETS_POLL_INTERVAL_IN_SECONDS,
      inForce: SECRETS_IN_FORCE,
      onChange: (changed) => {
        logger.log(`Secrets file changed (${changed.join(', ')}), exiting so the new values are read at start`);
        void shutdown('rotated secrets', 0);
      },
      onError: (error) => logger.error(error),
    }).start();
  }

  // handling uncaught exceptions when application exits abnormally
  process.on('uncaughtException', async (error) => {
    logger.log('uncaught exception');
    const orm = app.get(MikroORM);
    if (orm) {
      if (orm.em.isInTransaction()) {
        logger.log('rolling back active DB transactions');
        await orm.em.rollback();
      }

      logger.log('closing DB connection');
      await orm.close();
    }
    logger.log('application will exit in 5 seconds');
    setTimeout(() => process.exit(1), 5000);
    logger.error(error);
  });

  // sentry
  const release = `${APP_NAME}@${APP_VERSION}`;
  Sentry.init({ dsn: sentryDsn, release, environment });

  // cors
  if (corsWhitelist !== '') {
    const whitelistRegexp = new RegExp(corsWhitelist);

    app.enableCors({
      origin(origin, callback) {
        if (!origin || whitelistRegexp.test(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
    });
  }

  // swagger
  const swaggerConfig = new DocumentBuilder().setTitle(APP_DESCRIPTION).setVersion(APP_VERSION).build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(SWAGGER_URL, app, swaggerDocument);

  app.useGlobalPipes(new ValidationPipe(validationOpt));

  // app
  await app.listen(appPort, '0.0.0.0', () => logger.log(`Listening on ${appPort}`));
}
bootstrap();
