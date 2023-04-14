/* eslint-disable @typescript-eslint/no-explicit-any */
import { LoggerService } from '@nestjs/common';

const seconds = (d1: Date, d2: Date) => (d2.getTime() - d1.getTime()) / 1000;

export function OneAtTime() {
  return function <T extends (...args: any[]) => Promise<unknown>>(
    target: unknown,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<T>,
  ) {
    const method = descriptor.value as T;
    let isExecuting = false;
    let dateExecuting: Date;

    descriptor.value = async function (this: { logger?: LoggerService }, ...args) {
      if (isExecuting) {
        this.logger?.log(`Already running ${propertyName}`, {
          propertyName,
          executing: isExecuting,
          timeExecuting: dateExecuting ? seconds(dateExecuting, new Date()) : null,
        });

        return;
      }

      try {
        isExecuting = true;
        dateExecuting = new Date();
        return await method.apply(this, args);
      } catch (error) {
        this.logger?.error(error);
        return;
      } finally {
        isExecuting = false;
      }
    } as T;
  };
}
