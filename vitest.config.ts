import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // same "@/..." alias as tsconfig, so tests can import API routes directly
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: { environment: "node", include: ["tests/**/*.test.ts"], testTimeout: 120000, hookTimeout: 120000 },
});
