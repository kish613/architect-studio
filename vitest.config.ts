import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@pascal-app/core": path.resolve(import.meta.dirname, "client", "src", "lib", "pascal-app", "core"),
      "@pascal-app/viewer": path.resolve(import.meta.dirname, "client", "src", "lib", "pascal-app", "viewer"),
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  test: {
    environment: "happy-dom",
    globals: true,
    include: ["client/src/**/*.test.ts", "api/**/*.test.ts"],
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
