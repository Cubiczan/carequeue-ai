import { describe, it, expect } from 'vitest';

describe('Stellar Critical Metal Traceability Basic Tests', () => {
  describe('cn utility', () => {
    it('should merge class names', () => {
      const { cn } = require('../src/lib/utils');
      const result = cn('text-sm', 'font-bold');
      expect(result).toContain('text-sm');
      expect(result).toContain('font-bold');
    });
  });

  describe('Stellar SDK module', () => {
    it('should export network constants', () => {
      // Verify the stellar module exports expected values
      // Without network access, we just check the module structure
      const stellar = require('../src/lib/stellar');
      expect(stellar.HORIZON_URL).toBeDefined();
      expect(stellar.SOROBAN_RPC_URL).toBeDefined();
      expect(stellar.NETWORK_PASSPHRASE).toBeDefined();
    });
  });

  describe('project structure', () => {
    it('should have correct package.json', () => {
      const pkg = require('../package.json');
      expect(pkg.scripts).toBeDefined();
      expect(pkg.scripts.build).toBeDefined();
      expect(pkg.scripts.test).toBeDefined();
    });
  });
});
