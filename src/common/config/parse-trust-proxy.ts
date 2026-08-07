import { isIP } from 'net';

/**
 * TRUSTED_PROXIES: a comma-separated list of trusted proxy IPs/CIDRs, or empty.
 *   Empty  -> proxy trust disabled; the client key is taken from the socket
 *             address. Correct for direct access; behind a proxy this collapses
 *             all clients into one bucket.
 *   List   -> trust ONLY the given proxies; request.ip resolves to the first
 *             untrusted hop (the real client).
 * Hop-count is intentionally unsupported — trust by identity, not by position.
 *
 * Validation mirrors proxy-addr (the parser Fastify's trustProxy uses): every
 * entry must be a valid IP or IP/CIDR, the prefix must be decimal digits only
 * and within 1..32 (IPv4) / 1..128 (IPv6). Empty entries (stray commas) and
 * anything proxy-addr would reject throw here, so a config that passes this
 * function never fails later at Fastify boot.
 */
export function parseTrustProxy(raw?: string): false | string {
  const v = raw?.trim();
  if (!v) return false;

  // No filter(Boolean): empty entries from stray commas must fail loudly, not be
  // silently swallowed (a value of only commas would otherwise disable trust unnoticed).
  const entries = v.split(',').map((s) => s.trim());

  for (const entry of entries) {
    if (!isValidIpOrCidr(entry)) {
      throw new Error(
        `TRUSTED_PROXIES: invalid IP/CIDR entry "${entry}". ` +
          `Use a comma-separated list of IP/CIDR ranges, or leave empty.`,
      );
    }
  }
  return entries.join(',');
}

function isValidIpOrCidr(entry: string): boolean {
  const slash = entry.indexOf('/');
  if (slash === -1) return isIP(entry) !== 0;

  const addr = entry.slice(0, slash);
  const prefix = entry.slice(slash + 1);
  const version = isIP(addr); // 4 | 6 | 0
  if (version === 0) return false;

  // Decimal digits only — rejects "+24", "0x18", "", " 24", "24.5" that Number() coerces
  if (!/^[0-9]+$/.test(prefix)) return false;
  const p = Number(prefix);
  const max = version === 4 ? 32 : 128;
  return p >= 1 && p <= max; // proxy-addr requires a positive prefix within range (rejects /0)
}
