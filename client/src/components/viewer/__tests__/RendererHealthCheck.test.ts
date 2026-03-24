import { describe, it, expect, beforeEach, vi } from "vitest";
import { getPreferredRenderer, setPreferredRenderer, RENDERER_KEY } from "../RendererHealthCheck";

// Mock localStorage for happy-dom environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, writable: true });

describe("RendererHealthCheck", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("returns 'pascal' by default when no preference cached", () => {
    expect(getPreferredRenderer()).toBe("pascal");
  });

  it("returns cached preference", () => {
    setPreferredRenderer("r3f");
    expect(getPreferredRenderer()).toBe("r3f");
  });

  it("stores preference in localStorage", () => {
    setPreferredRenderer("pascal");
    expect(localStorageMock.setItem).toHaveBeenCalledWith(RENDERER_KEY, "pascal");
  });

  it("ignores invalid localStorage values", () => {
    localStorageMock.setItem(RENDERER_KEY, "invalid");
    expect(getPreferredRenderer()).toBe("pascal");
  });
});
