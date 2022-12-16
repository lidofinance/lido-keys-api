import { GENERAL_FIELDS } from 'http/keys/entities';
import { toList, prepareQuery } from '../../src/http/common/utils';
describe('toList', () => {
  test('fields as a list of strings ', () => {
    expect(toList([GENERAL_FIELDS.DEPOSIT_SIGNATURE, 'something else'])).toEqual([
      GENERAL_FIELDS.DEPOSIT_SIGNATURE,
      'something else',
    ]);
  });

  test('multiple fields in one string', () => {
    expect(toList(`${GENERAL_FIELDS.DEPOSIT_SIGNATURE},${'something else'}`)).toEqual([
      GENERAL_FIELDS.DEPOSIT_SIGNATURE,
      'something else',
    ]);
  });

  test('one field as a string', () => {
    expect(toList(`${GENERAL_FIELDS.DEPOSIT_SIGNATURE}`)).toEqual([GENERAL_FIELDS.DEPOSIT_SIGNATURE]);
  });

  test('undefined', () => {
    expect(toList(undefined)).toEqual([]);
  });
});

describe('prepareQuery', () => {
  test('filter unallowed fields', () => {
    expect(prepareQuery(['field1', 'field2', 'field3'], ['field1', 'field3'])).toEqual(['field1', 'field3']);
  });
});
