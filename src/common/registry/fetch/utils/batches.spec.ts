import { makeBatches } from './batches';

describe('makeBatches util', () => {
  test('should create batches with correct offset and batchSize', () => {
    const batchSize = 3;
    const offset = 0;
    const totalAmount = 10;

    const result = makeBatches(batchSize, offset, totalAmount);

    expect(result).toEqual([
      { offset: 0, batchSize: 3 },
      { offset: 3, batchSize: 3 },
      { offset: 6, batchSize: 3 },
      { offset: 9, batchSize: 1 },
    ]);
  });

  test('should create a single batch when totalAmount is less than batchSize', () => {
    const batchSize = 10;
    const offset = 2;
    const totalAmount = 8;

    const result = makeBatches(batchSize, offset, totalAmount);

    expect(result).toEqual([{ offset: 2, batchSize: 8 }]);
  });

  test('should handle cases when totalAmount is 0', () => {
    const batchSize = 5;
    const offset = 0;
    const totalAmount = 0;

    const result = makeBatches(batchSize, offset, totalAmount);

    expect(result).toEqual([]);
  });

  test('should throw error when batchSize is 0', () => {
    const batchSize = 0;
    const offset = 2;
    const totalAmount = 8;

    expect(() => makeBatches(batchSize, offset, totalAmount)).toThrowError('batchSize must be greater than 0');
  });

  test('should create batches correct offset and batchSize when totalAmount is a multiple of batchSize', () => {
    const batchSize = 4;
    const offset = 2;
    const totalAmount = 16;

    const result = makeBatches(batchSize, offset, totalAmount);

    expect(result).toEqual([
      { offset: 2, batchSize: 4 },
      { offset: 6, batchSize: 4 },
      { offset: 10, batchSize: 4 },
      { offset: 14, batchSize: 4 },
    ]);
  });
});
