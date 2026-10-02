import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url)).replace(/\\/g, "/").replace(/\/$/, "");

// Unit tests for pure modules (validation, formatting, rendering). Next.js compiles
// the app itself; here JSX uses React's automatic runtime.
export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  resolve: { alias: [{ find: /^@\//, replacement: `${root}/` }] },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
});
