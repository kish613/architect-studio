import { vi } from "vitest";
import { eventBus } from "@/lib/pascal/event-bus";

beforeEach(() => {
  eventBus.clear();
});

describe("on() and emit()", () => {
  it("handler receives correct data", () => {
    const handler = vi.fn();
    eventBus.on("node:created", handler);

    const data = { node: { type: "site" } as any };
    eventBus.emit("node:created", data);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(data);
  });

  it("multiple handlers are all called", () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    eventBus.on("selection:changed", h1);
    eventBus.on("selection:changed", h2);

    eventBus.emit("selection:changed", { nodeIds: ["a"] });

    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it("handler for a different event is not called", () => {
    const handler = vi.fn();
    eventBus.on("tool:changed", handler);

    eventBus.emit("selection:changed", { nodeIds: [] });

    expect(handler).not.toHaveBeenCalled();
  });
});

describe("unsubscribe", () => {
  it("returned function prevents future calls", () => {
    const handler = vi.fn();
    const unsub = eventBus.on("scene:loaded", handler);

    eventBus.emit("scene:loaded", { nodeCount: 5 });
    expect(handler).toHaveBeenCalledOnce();

    unsub();
    eventBus.emit("scene:loaded", { nodeCount: 10 });
    expect(handler).toHaveBeenCalledOnce(); // still 1
  });
});

describe("error isolation", () => {
  it("throwing handler does not prevent others from running", () => {
    const bad = vi.fn(() => {
      throw new Error("boom");
    });
    const good = vi.fn();

    eventBus.on("tool:changed", bad);
    eventBus.on("tool:changed", good);

    eventBus.emit("tool:changed", { tool: "wall" });

    expect(bad).toHaveBeenCalledOnce();
    expect(good).toHaveBeenCalledOnce();
  });

  it("error is logged to console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const bad = () => {
      throw new Error("oops");
    };

    eventBus.on("scene:saved", bad);
    eventBus.emit("scene:saved", { timestamp: 0 });

    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain("Event handler error");
    spy.mockRestore();
  });
});

describe("off()", () => {
  it("removes a specific handler", () => {
    const handler = vi.fn();
    eventBus.on("scene:dirty", handler);

    eventBus.off("scene:dirty", handler);
    eventBus.emit("scene:dirty", { dirtyNodeIds: [] });

    expect(handler).not.toHaveBeenCalled();
  });

  it("does not affect other handlers for the same event", () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    eventBus.on("scene:dirty", h1);
    eventBus.on("scene:dirty", h2);

    eventBus.off("scene:dirty", h1);
    eventBus.emit("scene:dirty", { dirtyNodeIds: ["x"] });

    expect(h1).not.toHaveBeenCalled();
    expect(h2).toHaveBeenCalledOnce();
  });
});

describe("clear()", () => {
  it("removes all handlers for all events", () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    eventBus.on("node:created", h1);
    eventBus.on("tool:changed", h2);

    eventBus.clear();

    eventBus.emit("node:created", { node: {} as any });
    eventBus.emit("tool:changed", { tool: "select" });

    expect(h1).not.toHaveBeenCalled();
    expect(h2).not.toHaveBeenCalled();
  });
});
