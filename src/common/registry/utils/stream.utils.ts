import { PassThrough } from 'stream';

/**
 * This util adds a timeout for streaming,
 * preventing errors related to stream hangs
 * this can happen when working with knex
 * @param stream nodejs stream
 * @param ms timeout in ms
 * @param errorMessage error text to be displayed when the stream is closed
 */
export const addTimeoutToStream = (stream: PassThrough, ms: number, errorMessage: string) => {
  let timeout = setTimeout(() => {
    stream.destroy(new Error(errorMessage));
  }, ms);

  const debounce = () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      stream.destroy(new Error(errorMessage));
    }, ms);
  };

  // we should stop streaming if more than "ms" has elapsed since the last receipt of data.
  const debounceTimeoutHandler = stream.on('data', debounce);

  stream.once('close', () => {
    clearTimeout(timeout);
    debounceTimeoutHandler.off('data', debounce);
  });
};
