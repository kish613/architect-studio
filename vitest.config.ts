import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  test: {
    environment: "happy-dom",
    globals: true,
    include: [
      "client/src/**/*.test.ts",
      "client/src/**/__tests__/**/*.test.tsx",
      "api/**/*.test.ts",
      "lib/**/*.test.ts",
    ],
    setupFiles: ["client/src/test-setup.ts"],
    coverage: {
      provider: "v8",
      include: [
        "client/src/lib/pascal/**",
        "client/src/stores/**",
        "client/src/components/viewer/systems/**",
        "api/lib/auth.ts",
      ],
    },
  },
});
