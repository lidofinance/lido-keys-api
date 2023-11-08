import { PassThrough } from 'stream';

export const addTimeoutToStream = (stream: PassThrough, ms: number) => {
  let timeout = setTimeout(() => {
    stream.destroy();
  }, ms);

  const debounce = () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      stream.destroy();
    }, ms);
  };

  const debounceTimeoutHandler = stream.on('data', debounce);

  stream.once('close', () => {
    clearTimeout(timeout);
    debounceTimeoutHandler.off('data', debounce);
  });
};
