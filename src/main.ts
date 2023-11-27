import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { SWAGGER_URL } from './http/common/swagger';
import { ConfigService } from './common/config';
import { AppModule, APP_DESCRIPTION, APP_NAME, APP_VERSION } from './app';
import { MikroORM } from '@mikro-orm/core';

// need also filter query params
// forbidUnknownValues: true
export const validationOpt = { transform: true };

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      trustProxy: true,
      ignoreTrailingSlash: true,
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

  // migrating when starting application
  await app.get(MikroORM).getMigrator().up();

  // versions
  app.enableVersioning({ type: VersioningType.URI });

  // logger
  const logger: Logger = app.get(LOGGER_PROVIDER);
  app.useLogger(logger);

  // enable onShutdownHooks for MikroORM to close DB connection
  // when application exits normally
  app.enableShutdownHooks();

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
