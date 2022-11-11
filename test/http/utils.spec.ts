import { FIELDS } from 'http/keys/entities';
import { toList } from '../../src/http/common/utils';

test('list of strings ', () => {
  expect(toList([FIELDS.SIGNATURE, 'something else'])).toEqual([FIELDS.SIGNATURE, 'something else']);
});

test('list of strings ', () => {
  expect(toList(`${FIELDS.SIGNATURE},${'something else'}`)).toEqual([FIELDS.SIGNATURE, 'something else']);
});

test('string ', () => {
  expect(toList(`${FIELDS.SIGNATURE}`)).toEqual([FIELDS.SIGNATURE]);
});

test('undefined', () => {
  expect(toList(undefined)).toEqual([]);
});
