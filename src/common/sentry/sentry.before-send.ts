import { Event } from '@sentry/node';

/** Masking function, `secretsMask` of @lido-nestjs/logger. */
export type Mask = <T>(input: T) => T;

/** Event fields `buildBeforeSend` masks: every field that can carry request or error data. */
export const MASKED_EVENT_FIELDS = [
  'message',
  'exception',
  'breadcrumbs',
  'tags',
  'request',
  'contexts',
  'extra',
  'user',
  'spans',
] as const;

/**
 * Builds the Sentry `beforeSend` hook that hides secrets in an outgoing event. The logger masks
 * only log lines; Sentry sends its events by itself, e.g. the provider URLs of outgoing HTTP
 * requests in breadcrumbs and in ethers error messages.
 *
 * The fields are masked one by one, not the whole event: the event has circular references,
 * which satanizer replaces with `[Cycle]`, and that would break fields Sentry needs.
 */
export const buildBeforeSend =
  (mask: Mask) =>
  (event: Event): Event => {
    const masked: Event = { ...event };
    for (const field of MASKED_EVENT_FIELDS) {
      if (event[field] !== undefined) (masked as Record<string, unknown>)[field] = mask(event[field]);
    }
    return masked;
  };
