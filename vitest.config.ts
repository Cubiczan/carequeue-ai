import { defineConfig } from 'vitest/config';

// Unit-test config for pure logic modules. CSS/PostCSS is disabled so the
// Next.js/Tailwind PostCSS pipeline is not loaded during tests.
export default defineConfig({
  // Provide an inline (empty) PostCSS config so Vite does not discover and load
  // the Next.js/Tailwind postcss.config.mjs, which is not loadable in this context.
  css: {
    postcss: { plugins: [] },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
