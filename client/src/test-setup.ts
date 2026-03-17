import { vi } from "vitest";

// Suppress Three.js WebGL warnings in test output
const originalWarn = console.warn;
vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
  if (
    typeof args[0] === "string" &&
    (args[0].includes("THREE.WebGLRenderer") ||
      args[0].includes("THREE.WebGL"))
  ) {
    return;
  }
  originalWarn(...args);
});
