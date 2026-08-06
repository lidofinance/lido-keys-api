import { isIP } from 'net';

/**
 * TRUSTED_PROXIES: a comma-separated list of trusted proxy IPs/CIDRs, or empty.
 *   Empty  -> proxy trust disabled; the client key is taken from the socket
 *             address. Correct for direct access; behind a proxy this collapses
 *             all clients into one bucket.
 *   List   -> trust ONLY the given proxies; request.ip resolves to the first
 *             untrusted hop (the real client).
 * Hop-count is intentionally unsupported — trust by identity, not by position.
 */
export function parseTrustProxy(raw?: string): false | string {
  const v = raw?.trim();
  if (!v) return false;

  const entries = v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (entries.length === 0) return false;

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

  const p = Number(prefix);
  if (!Number.isInteger(p) || p < 0) return false;
  return version === 4 ? p <= 32 : p <= 128; // valid prefix for ip
}
