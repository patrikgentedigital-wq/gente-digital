import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './print-tests',
  testMatch: 'print-report.test.ts',
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4174', browserName: 'chromium' },
  webServer: {
    command: 'npm run dev -- --config vite.print.config.ts --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174/e2e/print-fixture/',
    reuseExistingServer: false,
    timeout: 60000,
  },
});
