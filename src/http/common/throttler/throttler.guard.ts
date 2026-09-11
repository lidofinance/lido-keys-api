import { ThrottlerGuard } from '@nestjs/throttler';
import { Injectable } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { isIP } from 'net';
import { Address6 } from 'ip-address';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected async getTracker(request: FastifyRequest): Promise<string> {
    return normalizeTracker(resolveClientIp(request));
  }
}

// Behind Cloudflare the client IP comes from CF-Connecting-IP; otherwise fall
// back to request.ip.
function resolveClientIp(request: FastifyRequest): string {
  const cfConnectingIp = request.headers['cf-connecting-ip'];

  if (typeof cfConnectingIp === 'string') {
    const ip = cfConnectingIp.trim();
    if (isIP(ip)) return ip;
  }

  return request.ip;
}

// Per-client key: IPv4 as-is, IPv6 reduced to its /64 prefix.
function normalizeTracker(ip: string): string {
  if (isIP(ip) !== 6) return ip;

  try {
    const address = new Address6(ip);

    // IPv4-mapped IPv6 (::ffff:a.b.c.d) -> the plain IPv4 address.
    // isMapped4() matches only the ::ffff:0:0/96 form, unlike is4().
    if (address.isMapped4()) {
      return address.to4().correctForm();
    }

    return `${new Address6(`${ip}/64`).startAddress().correctForm()}/64`;
  } catch {
    return ip;
  }
}
