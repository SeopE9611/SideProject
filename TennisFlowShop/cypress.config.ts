import { defineConfig } from 'cypress';

export default defineConfig({
  video: false,
  screenshotOnRunFailure: true,
  defaultCommandTimeout: 8000,
  env: {
    E2E_ADMIN_BYPASS_TOKEN: process.env.E2E_ADMIN_BYPASS_TOKEN,
  },
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
  },
});
