import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5176",
    headless: true,
    channel: "chromium",
    launchOptions: {
      executablePath: "/snap/bin/chromium",
    },
  },
  projects: [
    {
      name: "chromium",
    },
  ],
});
