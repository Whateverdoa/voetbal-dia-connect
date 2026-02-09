import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('constants', () => {
  describe('ADMIN_PIN', () => {
    beforeEach(() => {
      // Reset module cache so each test gets a fresh import
      vi.resetModules();
    });

    it('exports ADMIN_PIN', async () => {
      const { ADMIN_PIN } = await import('./constants');
      expect(ADMIN_PIN).toBeDefined();
      expect(typeof ADMIN_PIN).toBe('string');
    });

    it('defaults to "9999" when NEXT_PUBLIC_ADMIN_PIN is not set', async () => {
      // Ensure the env var is absent
      delete process.env.NEXT_PUBLIC_ADMIN_PIN;
      const { ADMIN_PIN } = await import('./constants');
      expect(ADMIN_PIN).toBe('9999');
    });

    it('defaults to "9999" when NEXT_PUBLIC_ADMIN_PIN is empty string', async () => {
      process.env.NEXT_PUBLIC_ADMIN_PIN = '';
      const { ADMIN_PIN } = await import('./constants');
      // Empty string is falsy, so fallback to "9999"
      expect(ADMIN_PIN).toBe('9999');
    });

    it('respects NEXT_PUBLIC_ADMIN_PIN when set', async () => {
      process.env.NEXT_PUBLIC_ADMIN_PIN = '5555';
      const { ADMIN_PIN } = await import('./constants');
      expect(ADMIN_PIN).toBe('5555');
    });

    it('returns the env value as-is (string, not number)', async () => {
      process.env.NEXT_PUBLIC_ADMIN_PIN = '0042';
      const { ADMIN_PIN } = await import('./constants');
      // Leading zeros are preserved — it's a PIN, not a number
      expect(ADMIN_PIN).toBe('0042');
    });
  });
});
