import { CallOverrides } from '../interfaces/overrides.interface';

export const makeBatches = (
  batchSize: number,
  offset: number,
  totalAmount: number,
) => {
  const numberOfBatches = Math.ceil(totalAmount / batchSize);
  const batches: { offset: number; batchSize: number }[] = [];

  for (let i = 0; i < numberOfBatches; i++) {
    const currentOffset = offset + i * batchSize;
    const currentBatchSize = Math.min(batchSize, totalAmount - i * batchSize);
    batches.push({ offset: currentOffset, batchSize: currentBatchSize });
  }

  return batches;
};
