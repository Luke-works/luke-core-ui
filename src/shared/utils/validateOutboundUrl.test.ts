import { describe, it, expect } from 'vitest';
import { validateOutboundUrl } from './validateOutboundUrl';

describe('validateOutboundUrl (#32)', () => {
  it('accepts a normal https URL', () => {
    expect(validateOutboundUrl('https://api.example.com/webhook')).toBeNull();
    expect(validateOutboundUrl('http://api.example.com/hook')).toBeNull();
  });

  it('rejects empty / malformed input', () => {
    expect(validateOutboundUrl('')).toMatch(/required/i);
    expect(validateOutboundUrl('not a url')).toMatch(/valid url/i);
  });

  it('rejects non-http(s) schemes (SSRF vectors)', () => {
    expect(validateOutboundUrl('file:///etc/passwd')).toMatch(/scheme/i);
    expect(validateOutboundUrl('gopher://x/_')).toMatch(/scheme/i);
  });

  it('blocks internal / private / link-local hosts', () => {
    expect(validateOutboundUrl('http://localhost:8080/x')).toMatch(/internal|private/i);
    expect(validateOutboundUrl('http://127.0.0.1/x')).toMatch(/internal|private/i);
    expect(validateOutboundUrl('http://169.254.169.254/latest/meta-data')).toMatch(/internal|private/i);
    expect(validateOutboundUrl('http://10.0.0.5/x')).toMatch(/internal|private/i);
    expect(validateOutboundUrl('http://192.168.1.1/x')).toMatch(/internal|private/i);
    expect(validateOutboundUrl('http://172.16.0.9/x')).toMatch(/internal|private/i);
    expect(validateOutboundUrl('http://[::1]/x')).toMatch(/internal|private/i);
  });

  it('allows public IANA-ish addresses', () => {
    expect(validateOutboundUrl('https://8.8.8.8/x')).toBeNull();
    expect(validateOutboundUrl('https://172.32.0.1/x')).toBeNull(); // just outside 172.16/12
  });
});
