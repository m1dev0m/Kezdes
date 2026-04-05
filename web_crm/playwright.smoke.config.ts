import baseConfig from "./playwright.config";

export default {
  ...baseConfig,
  testDir: "./e2e",
  testMatch: /smoke\.spec\.ts/,
};

