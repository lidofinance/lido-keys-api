/* eslint-disable @typescript-eslint/no-explicit-any */
import { LoggerService } from '@nestjs/common';

export function OneAtTime() {
  return function <T extends (...args: any[]) => Promise<unknown>>(
    target: unknown,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<T>,
  ) {
    const method = descriptor.value as T;
    let isExecuting = false;

    descriptor.value = async function (this: { logger?: LoggerService }, ...args) {
      if (isExecuting) {
        this.logger?.log(`Already running ${propertyName}}`);
        return;
      }

      try {
        isExecuting = true;
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
