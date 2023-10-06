import { z } from 'zod';

export class ConsensusDataInvalidError extends Error {
  public constructor(message: string, public readonly zodError?: z.ZodError) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
