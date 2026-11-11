import http = require('http');
import https = require('https');
import { once } from 'events';
import { AddressInfo, Socket } from 'net';
import fetch from 'node-fetch';
import { utils } from 'ethers';
import { ExtendedJsonRpcBatchProvider } from '@lido-nestjs/execution';
import { configureHttpAgents } from './http-agents';

// The clients KAPI sends its EL requests with
const clients = [
  {
    name: 'ethers',
    create: (url: string) => async () => {
      const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] });
      return (await utils.fetchJson({ url, timeout: 1000 }, body)).result;
    },
  },
  {
    name: 'EL provider of @lido-nestjs/execution',
    create: (url: string) => {
      const provider = new ExtendedJsonRpcBatchProvider({ url, timeout: 1000 }, { name: 'local', chainId: 1 });
      return () => provider.send('eth_blockNumber', []);
    },
  },
];

describe('HTTP agents', () => {
  let savedHttpAgent: http.Agent;
  let savedHttpsAgent: https.Agent;
  let server: http.Server;
  let url: string;
  let requestsPerSocket: Map<Socket, number>;

  beforeEach(async () => {
    savedHttpAgent = http.globalAgent;
    savedHttpsAgent = https.globalAgent;
    // Node.js 19+ defaults
    http.globalAgent = new http.Agent({ keepAlive: true });
    https.globalAgent = new https.Agent({ keepAlive: true });
    requestsPerSocket = new Map();

    server = http.createServer((request, response) => {
      const count = (requestsPerSocket.get(request.socket) ?? 0) + 1;
      requestsPerSocket.set(request.socket, count);
      // A proxy that closes an idle connection just as the next request arrives on it
      if (count > 1) return request.socket.destroy();

      let body = '';
      request.on('data', (chunk) => (body += chunk));
      request.on('end', () => {
        const payload = JSON.parse(body);
        const reply = ({ id }: { id: number }) => ({ jsonrpc: '2.0', id, result: '0x2a' });
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify(Array.isArray(payload) ? payload.map(reply) : reply(payload)));
      });
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    http.globalAgent.destroy();
    https.globalAgent.destroy();
    http.globalAgent = savedHttpAgent;
    https.globalAgent = savedHttpsAgent;
    requestsPerSocket.forEach((_, socket) => socket.destroy());
    await new Promise((resolve) => server.close(resolve));
  });

  describe.each(clients)('$name', ({ create }) => {
    it('without the fix, fails a request sent on a reused connection the server has closed', async () => {
      const request = create(url);

      await expect(request()).resolves.toBe('0x2a');
      await expect(request()).rejects.toThrow();
      // both requests went over one connection
      expect(requestsPerSocket.size).toBe(1);
    });

    it('with the fix, sends every request on a new connection', async () => {
      configureHttpAgents();
      const request = create(url);

      for (let i = 0; i < 4; i++) await expect(request()).resolves.toBe('0x2a');
      expect([...requestsPerSocket.values()]).toEqual([1, 1, 1, 1]);
    });
  });

  // node-fetch 2 sends `Connection: close` when it is not given an agent, as in @lido-nestjs/fetch
  it('CL requests (node-fetch) open a new connection each time even without the fix', async () => {
    const request = async () => (await (await fetch(url, { method: 'POST', body: '{"id":1}' })).json()).result;

    for (let i = 0; i < 4; i++) await expect(request()).resolves.toBe('0x2a');
    expect([...requestsPerSocket.values()]).toEqual([1, 1, 1, 1]);
  });

  it('keeps the agent instances and their options', () => {
    const httpAgent = http.globalAgent;
    const httpsAgent = https.globalAgent;
    const httpsOptions = httpsAgent.options;

    configureHttpAgents();

    expect(http.globalAgent).toBe(httpAgent);
    expect(https.globalAgent).toBe(httpsAgent);
    expect(https.globalAgent.options).toBe(httpsOptions);
    expect(httpAgent).toMatchObject({ keepAlive: false });
    expect(httpsAgent).toMatchObject({ keepAlive: false });
  });
});
