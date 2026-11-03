import { existsSync } from "node:fs";
import { defineConfig } from "vitest/config";

// Tests read api/.env.test (the test database), never api/.env (the live one).
// In CI there is no file; the workflow sets the same variables instead.
if (existsSync(".env.test")) process.loadEnvFile(".env.test");

export default defineConfig({
  test: {
    setupFiles: ["./test/setup.ts"],
    fileParallelism: false, // every test file uses the same database, so run files one at a time
    clearMocks: true, // forget mock calls between tests
    testTimeout: 30_000, // a remote Neon branch is slower than a local database
    hookTimeout: 30_000,
  },
});