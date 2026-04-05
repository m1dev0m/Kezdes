import { defineConfig } from "@playwright/test";
import fs from "node:fs";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173";
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ||
  ([
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/snap/bin/chromium",
  ].find((path) => fs.existsSync(path)) ??
    undefined);
const apiURL = process.env.PLAYWRIGHT_API_URL ?? "http://127.0.0.1:8000/api/v1";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: "list",
  webServer: {
    command: `VITE_API_URL=${apiURL} npm run dev -- --host 127.0.0.1 --port 5173`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
  use: {
    baseURL,
    headless: true,
    ...(executablePath
      ? {
          launchOptions: {
            executablePath,
          },
        }
      : {}),
  },
  projects: [
    {
      name: "chromium",
    },
  ],
});
