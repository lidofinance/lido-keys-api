import { z } from 'zod';

/**
 * Root (hex-string)
 * Possible values: 0x0...0 ... 0xF...F (64 digits)
 */
export const RootHex = z
  .string({ description: 'Root (hex-string) ' })
  .regex(/^0x[a-fA-F0-9]{64}$/)
  .transform((x) => x.toLocaleLowerCase());

/**
 * Hash32 (hex-string)
 * Possible values: 0x0...0 ... 0xF...F (64 digits)
 */
export const Hash32Hex = z
  .string({ description: 'Hash32 (hex-string) ' })
  .regex(/^0x[a-fA-F0-9]{64}$/)
  .transform((x) => x.toLocaleLowerCase());

/**
 * BLSPubkey (hex-string)
 * Possible values: 0x0...0 ... 0xF...F (96 digits)
 */
export const BLSPubkeyHex = z
  .string({ description: 'BLSPubkey (hex-string) ' })
  .regex(/^0x[a-fA-F0-9]{96}$/)
  .transform((x) => x.toLocaleLowerCase());

export type BLSPubkeyHex = z.infer<typeof BLSPubkeyHex>;

/**
 * Non-negative Integer (JS Number)
 * Possible values: 0...N (2^53-1)
 */
export const IntegerNonNegative = z
  .number({ description: 'Integer (non-negative)' })
  .int()
  .min(0)
  .max(Number.MAX_SAFE_INTEGER);

export type IntegerNonNegative = z.infer<typeof IntegerNonNegative>;

/**
 * Non-negative Integer (will be transformed from string to JS Number)
 * Possible values: '0'...'N' (2^53-1)
 */
export const IntegerFromStringNonNegative = z
  .string()
  .regex(/^\d+$/)
  .transform((x, ctx) => {
    const value = parseInt(x, 10);
    const res = IntegerNonNegative.safeParse(value);
    if (!res.success) {
      res.error.issues.map((i) => ctx.addIssue(i));
      return z.NEVER;
    }

    return res.data;
  });

export type IntegerFromStringNonNegative = z.infer<typeof IntegerFromStringNonNegative>;

/**
 * Slot (JS Number)
 * Possible values: 0...N (2^53-1)
 */
export const Slot = z.union([IntegerNonNegative, IntegerFromStringNonNegative], {
  description: 'Slot',
});

export type Slot = z.infer<typeof Slot>;

/**
 * Epoch (JS Number)
 * Possible values: 0...N (2^53-1)
 */
export const Epoch = z.union([IntegerNonNegative, IntegerFromStringNonNegative], {
  description: 'Epoch',
});

export type Epoch = z.infer<typeof Epoch>;

/**
 * Block Index (JS Number)
 * Possible values: 0...N (2^53-1)
 */
export const BlockNumber = z.union([IntegerNonNegative, IntegerFromStringNonNegative], {
  description: 'BlockNumber',
});

export type BlockNumber = z.infer<typeof BlockNumber>;

/**
 * Validator Index (JS Number)
 * Possible values: 0...N (2^53-1)
 */
export const ValidatorIndex = z.union([IntegerNonNegative, IntegerFromStringNonNegative], {
  description: 'ValidatorIndex',
});

export type ValidatorIndex = z.infer<typeof ValidatorIndex>;

/**
 * Block Timestamp (JS Number)
 * Possible values: 0...N (2^53-1)
 */
export const BlockTimestamp = z.union([IntegerNonNegative, IntegerFromStringNonNegative], {
  description: 'BlockTimestamp',
});

export type BlockTimestamp = z.infer<typeof BlockTimestamp>;
