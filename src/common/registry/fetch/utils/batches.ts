export const makeBatches = (batchSize: number, offset: number, limit: number) => {
  if (!Number.isInteger(offset) || offset < 0) {
    throw new RangeError('offset should be positive integer');
  }
  if (!Number.isInteger(limit) || limit < 0) {
    throw new RangeError('limit should be positive integer');
  }
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new RangeError('batchSize must be greater than 0 and integer');
  }
  const numberOfBatches = Math.ceil(limit / batchSize);
  const batches: { offset: number; batchSize: number }[] = [];

  for (let i = 0; i < numberOfBatches; i++) {
    const currentOffset = offset + i * batchSize;
    const currentBatchSize = Math.min(batchSize, limit - i * batchSize);
    batches.push({ offset: currentOffset, batchSize: currentBatchSize });
  }

  return batches;
};
