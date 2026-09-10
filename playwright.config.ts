import { defineConfig } from "@playwright/test";

const PORT = 3111;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: process.env.E2E_BASE_URL || `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run build && npm run start -- -p ${PORT}`,
        port: PORT,
        reuseExistingServer: true,
        timeout: 300_000,
        env: {
          ...process.env,
          DATABASE_URL:
            process.env.DATABASE_URL ||
            "postgresql://ci_user:ci_pass@localhost:5432/ci_db",
        },
      },
});
