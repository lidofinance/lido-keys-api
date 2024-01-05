import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { MikroORM } from '@mikro-orm/core';
import { WorkerAppModule } from 'app/worker-app.module';
import { isMainThread, workerData } from 'worker_threads';

async function bootstrap() {
  console.log(workerData);
  if (!isMainThread) {
    console.log('wow, i am here');
    const app = await NestFactory.createApplicationContext(WorkerAppModule, {
      bufferLogs: true,
    });

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
  }
}

bootstrap();
