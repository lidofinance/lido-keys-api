/* eslint-disable @typescript-eslint/no-explicit-any */
import { LoggerService } from '@nestjs/common';

const seconds = (d1: Date, d2: Date) => (d2.getTime() - d1.getTime()) / 1000;

export function Trace(ms: number) {
  return function <T extends (...args: any[]) => Promise<unknown>>(
    target: unknown,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<T>,
  ) {
    const method = descriptor.value as T;

    let dateExecuting: Date | null;

    descriptor.value = async function (this: { loggerService?: LoggerService }, ...args) {
      const timer = setTimeout(() => {
        this.loggerService?.error(`TRACE_TIMEOUT ${propertyName} ERROR`, {
          propertyName,
          timeExecuting: dateExecuting ? seconds(dateExecuting, new Date()) : null,
          timeout: ms,
        });
      }, ms);

      try {
        dateExecuting = new Date();
        return await method.apply(this, args);
      } catch (error) {
        throw error;
      } finally {
        dateExecuting = null;
        clearTimeout(timer);
      }
    } as T;
  };
}
