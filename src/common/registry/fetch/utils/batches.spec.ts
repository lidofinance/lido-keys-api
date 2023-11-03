import { makeBatches } from './batches';

describe('batch', () => {
  test('total <<< batch, offset 0, total 0', () => {
    const dataBatches = makeBatches(200, 0, 0);

    expect(dataBatches).toEqual([]);
  });

  test('total >>> batch, offset 800, total 800', () => {
    const dataBatches = makeBatches(200, 799, 1);

    // strange
    expect(dataBatches).toEqual([{ batchSize: 1, offset: 799 }]);
  });

  test('total <<< batch, offset 0, total 1', () => {
    const dataBatches = makeBatches(200, 0, 1);

    expect(dataBatches).toEqual([{ batchSize: 1, offset: 0 }]);
  });

  test('total <<< batch, offset 1, total 1', () => {
    const dataBatches = makeBatches(200, 1, 1);

    expect(dataBatches).toEqual([{ batchSize: 1, offset: 1 }]);
  });

  test('total === batch, offset 1, total 10', () => {
    const dataBatches = makeBatches(10, 1, 10);

    // thought that batchSize is 10
    expect(dataBatches).toEqual([{ batchSize: 10, offset: 1 }]);
  });

  test('total < batch, offset 1, total 3', () => {
    const dataBatches = makeBatches(10, 1, 3);

    // thought that batchSize here is 2
    expect(dataBatches).toEqual([{ batchSize: 3, offset: 1 }]);
  });

  test('total === batch, offset 1, total 3', () => {
    const dataBatches = makeBatches(3, 1, 3);

    // thought that batchSize here is 2
    expect(dataBatches).toEqual([{ batchSize: 3, offset: 1 }]);
  });

  test('total > batch, offset 0, total 199', () => {
    const dataBatches = makeBatches(100, 0, 199);

    expect(dataBatches).toEqual([
      { batchSize: 100, offset: 0 },
      { batchSize: 99, offset: 100 },
    ]);
  });

  test('total > batch, offset 100, total 199', () => {
    const dataBatches = makeBatches(100, 100, 199);

    // why?
    expect(dataBatches).toEqual([
      { batchSize: 100, offset: 100 },
      { batchSize: 99, offset: 200 },
    ]);
  });
});
