export const makeBatches = (batchSize: number, offset: number, totalAmount: number) => {
  if (batchSize < 1) throw new Error('batchSize must be greater than 0');
  const numberOfBatches = Math.ceil(totalAmount / batchSize);
  const batches: { offset: number; batchSize: number }[] = [];

  for (let i = 0; i < numberOfBatches; i++) {
    const currentOffset = offset + i * batchSize;
    const currentBatchSize = Math.min(batchSize, totalAmount - i * batchSize);
    batches.push({ offset: currentOffset, batchSize: currentBatchSize });
  }

  return batches;
};
