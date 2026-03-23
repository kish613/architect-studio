import { vi } from "vitest";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
