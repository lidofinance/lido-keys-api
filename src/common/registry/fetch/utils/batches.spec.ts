import { makeBatches } from './batches';

describe('makeBatches util', () => {
  test('should create batches with correct zero offset and batchSize', () => {
    const batchSize = 3;
    const offset = 0;
    const limit = 10;

    const result = makeBatches(batchSize, offset, limit);

    expect(result).toEqual([
      { offset: 0, batchSize: 3 },
      { offset: 3, batchSize: 3 },
      { offset: 6, batchSize: 3 },
      { offset: 9, batchSize: 1 },
    ]);
  });

  test('should create batches with correct not zero offset and batchSize', () => {
    const batchSize = 3;
    const offset = 1;
    const limit = 10;

    const result = makeBatches(batchSize, offset, limit);

    expect(result).toEqual([
      { offset: 1, batchSize: 3 },
      { offset: 4, batchSize: 3 },
      { offset: 7, batchSize: 3 },
      { offset: 10, batchSize: 1 },
    ]);
  });

  test('should create a single batch when limit is less than batchSize', () => {
    const batchSize = 10;
    const offset = 2;
    const limit = 8;

    const result = makeBatches(batchSize, offset, limit);

    expect(result).toEqual([{ offset: 2, batchSize: 8 }]);
  });

  test('should handle cases when limit is 0', () => {
    const batchSize = 5;
    const offset = 0;
    const limit = 0;

    const result = makeBatches(batchSize, offset, limit);

    expect(result).toEqual([]);
  });

  test('should throw error when batchSize is 0', () => {
    const batchSize = 0;
    const offset = 2;
    const limit = 8;

    expect(() => makeBatches(batchSize, offset, limit)).toThrowError('batchSize must be greater than 0 and integer');
  });

  test('should throw error when batchSize is not a number', () => {
    const batchSize: any = 'test';
    const offset = 2;
    const limit = 8;

    expect(() => makeBatches(batchSize, offset, limit)).toThrowError('batchSize must be greater than 0 and integer');
  });

  test('should throw error when limit is not a number', () => {
    const batchSize = 10;
    const offset = 2;
    const limit: any = 'test';

    expect(() => makeBatches(batchSize, offset, limit)).toThrowError('limit should be positive integer');
  });

  test('should throw error when limit is a negative number', () => {
    const batchSize = 10;
    const offset = 2;
    const limit = -1;

    expect(() => makeBatches(batchSize, offset, limit)).toThrowError('limit should be positive integer');
  });

  test('should throw error when offset is not a number', () => {
    const batchSize = 10;
    const offset: any = 'test';
    const limit = 2;

    expect(() => makeBatches(batchSize, offset, limit)).toThrowError('offset should be positive integer');
  });

  test('should throw error when offset is a negative number', () => {
    const batchSize = 10;
    const offset = -2;
    const limit = 10;

    expect(() => makeBatches(batchSize, offset, limit)).toThrowError('offset should be positive integer');
  });

  test('should create batches correct offset and batchSize when limit is a multiple of batchSize', () => {
    const batchSize = 4;
    const offset = 2;
    const limit = 16;

    const result = makeBatches(batchSize, offset, limit);

    expect(result).toEqual([
      { offset: 2, batchSize: 4 },
      { offset: 6, batchSize: 4 },
      { offset: 10, batchSize: 4 },
      { offset: 14, batchSize: 4 },
    ]);
  });
});
