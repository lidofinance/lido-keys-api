import { Event } from '@sentry/node';
import { secretsMask } from '@lido-nestjs/logger';
import { buildBeforeSend, MASKED_EVENT_FIELDS } from './sentry.before-send';

// A provider URL, as configured in PROVIDERS_URLS
const SECRET = 'https://el.example.org/v2/planted-fixture-value';

describe('buildBeforeSend', () => {
  const beforeSend = buildBeforeSend(secretsMask({ secrets: [SECRET] }));

  // The secret in every field the event can carry
  const eventWithSecretEverywhere = (): Event => ({
    message: `boom ${SECRET}`,
    exception: { values: [{ type: 'Error', value: `missing response (url="${SECRET}")` }] },
    breadcrumbs: [{ category: 'http', data: { url: SECRET, method: 'POST' } }],
    tags: { key: SECRET },
    request: { url: `${SECRET}/eth/v1/node/syncing` },
    contexts: { runtime: { detail: SECRET } },
    extra: { payload: { nested: [SECRET] } },
    user: { id: SECRET },
    spans: [{ description: SECRET } as never],
  });

  // Written out by hand: the tests below run per field of the same list, so a field dropped from it
  // would drop its test too
  it('masks every event field that can carry request or error data', () => {
    expect([...MASKED_EVENT_FIELDS].sort()).toEqual([
      'breadcrumbs',
      'contexts',
      'exception',
      'extra',
      'message',
      'request',
      'spans',
      'tags',
      'user',
    ]);
  });

  it.each(MASKED_EVENT_FIELDS)('masks the secret in event.%s', (field) => {
    const masked = beforeSend(eventWithSecretEverywhere());

    expect(masked[field]).toBeDefined();
    expect(JSON.stringify(masked[field])).not.toContain(SECRET);
  });

  it('keeps the fields it does not mask', () => {
    const masked = beforeSend({
      ...eventWithSecretEverywhere(),
      release: 'lido-keys-api@5.0.0',
      environment: 'production',
    });

    expect(masked.release).toBe('lido-keys-api@5.0.0');
    expect(masked.environment).toBe('production');
  });

  it('does not add the masked fields to an event without them', () => {
    expect(beforeSend({ event_id: 'abc' })).toEqual({ event_id: 'abc' });
  });
});
