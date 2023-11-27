import { Readable, ReadableOptions } from 'stream';

class GeneratorToStream<GeneratorResultType> extends Readable {
  constructor(options: ReadableOptions, protected readonly generator: AsyncGenerator<GeneratorResultType>) {
    super(options);
  }

  _read() {
    try {
      this.generator
        .next()
        .then((result) => {
          if (!result.done) {
            this.push(result.value);
          } else {
            this.push(null);
          }
        })
        .catch((e) => {
          this.emit('error', e);
        });
    } catch (e) {
      this.emit('error', e);
    }
  }
}

export function streamify<GeneratorResultType>(generator: AsyncGenerator<GeneratorResultType>) {
  return new GeneratorToStream<GeneratorResultType>({ objectMode: true }, generator);
}
