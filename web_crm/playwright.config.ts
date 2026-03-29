import { defineConfig } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173";
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: "list",
  use: {
    baseURL,
    headless: true,
    ...(executablePath
      ? {
          launchOptions: {
            executablePath,
          },
        }
      : { channel: "chromium" }),
  },
  projects: [
    {
      name: "chromium",
    },
  ],
});
