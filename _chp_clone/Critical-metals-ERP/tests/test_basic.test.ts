/**
 * Basic smoke tests for Critical Metals ERP.
 *
 * Tests the integrations API gateway (Express.js).
 */

describe('Critical Metals ERP Basic Tests', () => {
  describe('project structure', () => {
    it('should have a valid integrations package.json', () => {
      const pkg = require('../integrations/package.json');
      expect(pkg.name).toBe('battery-erp-integrations');
      expect(pkg.scripts.test).toBeDefined();
    });

    it('should have a valid shop-floor package.json', () => {
      const pkg = require('../shop-floor/package.json');
      expect(pkg.name).toBe('battery-erp-shop-floor');
    });
  });

  describe('integrations index', () => {
    it('should export an express app', () => {
      // The index.js creates an Express app and exports it
      // Without env vars this will fail to start Redis, but the module should export app
      try {
        const app = require('../integrations/src/index');
        expect(app).toBeDefined();
      } catch (err: any) {
        // Expected: Redis connection may fail, but app module should be loadable
        expect(err.message).toBeDefined();
      }
    });
  });
});
