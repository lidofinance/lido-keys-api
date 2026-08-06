import { parseTrustProxy } from './parse-trust-proxy';

describe('parseTrustProxy', () => {
  describe('empty / disabled input', () => {
    it('should return false when raw is undefined', () => {
      expect(parseTrustProxy(undefined)).toBe(false);
    });

    it('should return false when raw is an empty string', () => {
      expect(parseTrustProxy('')).toBe(false);
    });

    it('should return false when raw is whitespace only', () => {
      expect(parseTrustProxy('   ')).toBe(false);
    });

    it('should return false when raw is only commas and whitespace', () => {
      expect(parseTrustProxy(' , , ')).toBe(false);
    });
  });

  describe('single valid entry', () => {
    it('should accept a single IPv4 address', () => {
      expect(parseTrustProxy('10.0.0.1')).toBe('10.0.0.1');
    });

    it('should accept a single IPv6 address', () => {
      expect(parseTrustProxy('::1')).toBe('::1');
      expect(parseTrustProxy('2001:db8::1')).toBe('2001:db8::1');
    });

    it('should accept an IPv4 CIDR range', () => {
      expect(parseTrustProxy('10.0.0.0/8')).toBe('10.0.0.0/8');
      expect(parseTrustProxy('192.168.0.0/16')).toBe('192.168.0.0/16');
    });

    it('should accept an IPv6 CIDR range', () => {
      expect(parseTrustProxy('2001:db8::/32')).toBe('2001:db8::/32');
    });
  });

  describe('CIDR prefix boundaries', () => {
    it('should accept the minimum IPv4 prefix /0', () => {
      expect(parseTrustProxy('10.0.0.0/0')).toBe('10.0.0.0/0');
    });

    it('should accept the maximum IPv4 prefix /32', () => {
      expect(parseTrustProxy('10.0.0.1/32')).toBe('10.0.0.1/32');
    });

    it('should reject an IPv4 prefix above /32', () => {
      expect(() => parseTrustProxy('10.0.0.1/33')).toThrow(/invalid IP\/CIDR entry "10\.0\.0\.1\/33"/);
    });

    it('should accept the maximum IPv6 prefix /128', () => {
      expect(parseTrustProxy('2001:db8::/128')).toBe('2001:db8::/128');
    });

    it('should reject an IPv6 prefix above /128', () => {
      expect(() => parseTrustProxy('2001:db8::/129')).toThrow(/invalid IP\/CIDR entry "2001:db8::\/129"/);
    });

    it('should reject a negative prefix', () => {
      expect(() => parseTrustProxy('10.0.0.0/-1')).toThrow(/invalid IP\/CIDR entry "10\.0\.0\.0\/-1"/);
    });

    it('should reject a non-integer prefix', () => {
      expect(() => parseTrustProxy('10.0.0.0/24.5')).toThrow(/invalid IP\/CIDR entry "10\.0\.0\.0\/24\.5"/);
      expect(() => parseTrustProxy('10.0.0.0/abc')).toThrow(/invalid IP\/CIDR entry "10\.0\.0\.0\/abc"/);
    });
  });

  describe('comma-separated lists', () => {
    it('should normalize a list of valid entries', () => {
      expect(parseTrustProxy('10.0.0.1,192.168.0.0/16,::1')).toBe('10.0.0.1,192.168.0.0/16,::1');
    });

    it('should trim surrounding whitespace around each entry', () => {
      expect(parseTrustProxy('  10.0.0.1 ,  192.168.0.0/16  ')).toBe('10.0.0.1,192.168.0.0/16');
    });

    it('should drop empty entries produced by extra commas', () => {
      expect(parseTrustProxy('10.0.0.1,,192.168.0.1')).toBe('10.0.0.1,192.168.0.1');
      expect(parseTrustProxy('10.0.0.1, ,192.168.0.1')).toBe('10.0.0.1,192.168.0.1');
    });
  });

  describe('invalid entries', () => {
    it('should throw on a malformed IP', () => {
      expect(() => parseTrustProxy('not-an-ip')).toThrow(/invalid IP\/CIDR entry "not-an-ip"/);
    });

    it('should throw on an out-of-range IPv4 octet', () => {
      expect(() => parseTrustProxy('999.0.0.1')).toThrow(/invalid IP\/CIDR entry "999\.0\.0\.1"/);
    });

    it('should throw on a CIDR with an invalid address part', () => {
      expect(() => parseTrustProxy('not-an-ip/24')).toThrow(/invalid IP\/CIDR entry "not-an-ip\/24"/);
    });

    it('should throw naming the first invalid entry in a list', () => {
      expect(() => parseTrustProxy('10.0.0.1,bad,192.168.0.1')).toThrow(/invalid IP\/CIDR entry "bad"/);
    });

    it('should include the usage hint in the error message', () => {
      expect(() => parseTrustProxy('bad')).toThrow(/comma-separated list of IP\/CIDR ranges, or leave empty/);
    });
  });
});
