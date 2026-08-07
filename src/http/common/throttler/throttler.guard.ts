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
    // clients are not collapsed into a single shared ::/64 bucket.
    // Use isMapped4() (checks the ::ffff:0:0/96 bits per RFC 4291 §2.5.5.2), not
    // is4() (true for any dotted-quad notation, e.g. 2001:db8::1.2.3.4, which is
    // a real IPv6 address and must NOT be collapsed into the IPv4 bucket).
    if (address.isMapped4()) {
      return address.to4().correctForm();
    }

    const network = new Address6(`${ip}/64`);
    return `${network.startAddress().correctForm()}/64`;
  } catch {
    return ip;
  }
}
