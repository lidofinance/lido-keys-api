import * as http from 'http';
import * as https from 'https';

/**
 * Turns off keep-alive of the global HTTP agents: every request opens a new connection.
 *
 * Since Node.js 19 the global agents keep connections open between requests. A server or proxy
 * closes an idle connection, sometimes without telling the client: a request sent on it then
 * fails with a socket error, or hangs until its timeout. ethers v5 sends the EL requests through
 * the global agents and does not resend such a request. The CL requests (node-fetch) already close
 * the connection after each request.
 *
 * The agents are changed in place, not replaced, so their other options stay. Call before any
 * provider is created or any request is sent.
 */
export function configureHttpAgents(): void {
  Object.assign(http.globalAgent, { keepAlive: false });
  Object.assign(https.globalAgent, { keepAlive: false });
}
