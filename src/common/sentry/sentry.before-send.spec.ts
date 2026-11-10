import { Event } from '@sentry/node';
import { secretsMask } from '@lido-nestjs/logger';
import { buildBeforeSend, MASKED_EVENT_FIELDS } from './sentry.before-send';

// A provider URL, as configured in PROVIDERS_URLS
const PROVIDER_URL = 'https://el.example.org/v2/planted-fixture-value';

describe('buildBeforeSend', () => {
  const beforeSend = buildBeforeSend(secretsMask({ secrets: [PROVIDER_URL] }));

  // The secret in every field the event can carry
  const eventWithSecretEverywhere = (): Event => ({
    message: `boom ${PROVIDER_URL}`,
    exception: { values: [{ type: 'Error', value: `missing response (url="${PROVIDER_URL}")` }] },
    breadcrumbs: [{ category: 'http', data: { url: PROVIDER_URL, method: 'POST' } }],
    tags: { key: PROVIDER_URL },
    request: { url: `${PROVIDER_URL}/eth/v1/node/syncing` },
    contexts: { runtime: { detail: PROVIDER_URL } },
    extra: { payload: { nested: [PROVIDER_URL] } },
    user: { id: PROVIDER_URL },
    spans: [{ description: PROVIDER_URL } as never],
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
    expect(JSON.stringify(masked[field])).not.toContain(PROVIDER_URL);
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
