import { ThrottlerGuard } from '@nestjs/throttler';
import { Injectable } from '@nestjs/common';
import { FastifyRequest } from 'fastify';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected async getTracker(request: FastifyRequest): Promise<string> {
    return request.ips?.length ? request.ips[0] : request.ip;
  }
}
