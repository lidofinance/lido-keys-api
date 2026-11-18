import * as http from 'http';
import { AddressInfo } from 'net';
import { INestApplication } from '@nestjs/common';
import { ELBlockSnapshot } from './common/entities';
import { elMeta } from './el-meta.fixture';

export const streamMeta: { elBlockSnapshot: ELBlockSnapshot } = {
  elBlockSnapshot: {
    blockNumber: elMeta.number,
    blockHash: elMeta.hash,
    timestamp: elMeta.timestamp,
    lastChangedBlockHash: elMeta.lastChangedBlockHash,
  },
};

// A row source that fails as a database stream would: it gives the first rows, then errors.
export const failingSource = <T>(rows: T[], rowsBeforeFailure: number): AsyncGenerator<T> =>
  (async function* () {
    for (const row of rows.slice(0, rowsBeforeFailure)) yield row;
    // A database error arrives on a later read, after the rows already given went out
    if (rowsBeforeFailure > 0) await new Promise((resolve) => setTimeout(resolve, 50));
    throw new Error('database failure');
  })();

export interface RawResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
  // false when the connection was cut before the response ended
  completed: boolean;
}

// A plain GET that reports what the client got, also when the connection is cut: supertest
// returns no response then, only an error.
export const getRaw = async (app: INestApplication, path: string): Promise<RawResponse> => {
  const server: http.Server = app.getHttpServer();
  if (!server.listening) await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  return new Promise((resolve, reject) => {
    http
      .get({ host: '127.0.0.1', port, path }, (res) => {
        let body = '';
        let completed = false;
        res.setEncoding('utf8');
        res.on('data', (chunk) => (body += chunk));
        // 'end' comes only when the response finished; a cut connection gives 'error' instead
        res.on('end', () => (completed = true));
        res.on('error', () => undefined);
        res.on('close', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body, completed }));
      })
      .on('error', reject);
  });
};
