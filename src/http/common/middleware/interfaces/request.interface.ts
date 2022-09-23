import { FastifyRequest } from 'fastify';
import { IncomingMessage } from 'http';

export interface Request extends IncomingMessage, Pick<FastifyRequest, 'ip'> {
  originalUrl?: string;
}
