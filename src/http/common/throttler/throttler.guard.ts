import { ThrottlerGuard } from '@nestjs/throttler';
import { Injectable } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { isIP } from 'net';
import { Address6 } from 'ip-address';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected async getTracker(request: FastifyRequest): Promise<string> {
    const ip = request.ip;

    if (isIP(ip) === 6) {
      return toIpv6Prefix64(ip);
    }

    return ip;
  }
}

function toIpv6Prefix64(ip: string): string {
  try {
    const address = new Address6(ip);
    // IPv4-mapped IPv6 (::ffff:a.b.c.d) -> unwrap to plain IPv4 so all mapped
    // clients are not collapsed into a single shared ::/64 bucket
    if (address.is4()) {
      return address.to4().correctForm();
    }

    const network = new Address6(`${ip}/64`);
    return `${network.startAddress().correctForm()}/64`;
  } catch {
    return ip;
  }
}
