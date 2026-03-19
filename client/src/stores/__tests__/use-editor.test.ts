import { useEditor } from "@/stores/use-editor";
import type { PanelId } from "@/stores/use-editor";

beforeEach(() => {
  useEditor.setState({
    activeTool: "select",
    phase: "idle",
    drawingPoints: [],
    previewPoint: null,
    placingCatalogItem: null,
    visiblePanels: new Set<PanelId>(["properties", "levels"]),
  });
});

function state() {
  return useEditor.getState();
}

// ---------------------------------------------------------------------------
// setTool
// ---------------------------------------------------------------------------

describe("useEditor – setTool", () => {
  it("sets activeTool", () => {
    state().setTool("wall");
    expect(state().activeTool).toBe("wall");
  });

  it("resets phase to idle", () => {
    state().addDrawingPoint({ x: 0, z: 0 });
    expect(state().phase).toBe("drawing");

    state().setTool("door");
    expect(state().phase).toBe("idle");
  });

  it("clears drawingPoints and previewPoint", () => {
    state().addDrawingPoint({ x: 1, z: 2 });
    state().setPreviewPoint({ x: 3, z: 4 });

    state().setTool("zone");
    expect(state().drawingPoints).toEqual([]);
    expect(state().previewPoint).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

describe("useEditor – drawing", () => {
  it("addDrawingPoint appends a point and sets phase to drawing", () => {
    state().addDrawingPoint({ x: 1, z: 2 });
    expect(state().drawingPoints).toEqual([{ x: 1, z: 2 }]);
    expect(state().phase).toBe("drawing");
  });

  it("multiple points accumulate", () => {
    state().addDrawingPoint({ x: 0, z: 0 });
    state().addDrawingPoint({ x: 5, z: 0 });
    state().addDrawingPoint({ x: 5, z: 5 });
    expect(state().drawingPoints).toHaveLength(3);
  });

  it("setPreviewPoint updates previewPoint", () => {
    state().setPreviewPoint({ x: 10, z: 20 });
    expect(state().previewPoint).toEqual({ x: 10, z: 20 });
  });

  it("setPreviewPoint can set null", () => {
    state().setPreviewPoint({ x: 1, z: 1 });
    state().setPreviewPoint(null);
    expect(state().previewPoint).toBeNull();
  });

  it("clearDrawing clears points, preview, and resets phase", () => {
    state().addDrawingPoint({ x: 1, z: 2 });
    state().setPreviewPoint({ x: 3, z: 4 });

    state().clearDrawing();
    expect(state().drawingPoints).toEqual([]);
    expect(state().previewPoint).toBeNull();
    expect(state().phase).toBe("idle");
  });
});

// ---------------------------------------------------------------------------
// cancelAction
// ---------------------------------------------------------------------------

describe("useEditor – cancelAction", () => {
  it("resets to select tool, idle phase, and clears drawing", () => {
    state().setTool("wall");
    state().addDrawingPoint({ x: 1, z: 2 });
    state().setPreviewPoint({ x: 3, z: 4 });

    state().cancelAction();

    expect(state().activeTool).toBe("select");
    expect(state().phase).toBe("idle");
    expect(state().drawingPoints).toEqual([]);
    expect(state().previewPoint).toBeNull();
  });

  it("clears any active catalog placement", () => {
    state().beginPlacement({
      id: "sofa-01",
      name: "Sofa",
      category: "living",
      modelUrl: "/assets/furniture/sofa-01.glb",
      thumbnailUrl: "/assets/furniture/sofa-01.webp",
      dimensions: { x: 2.2, y: 0.85, z: 0.9 },
      keywords: ["sofa"],
    });

    state().cancelAction();

    expect(state().placingCatalogItem).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Placement
// ---------------------------------------------------------------------------

describe("useEditor – placement", () => {
  it("beginPlacement enters placing mode with the chosen catalog item", () => {
    state().beginPlacement({
      id: "armchair-01",
      name: "Armchair",
      category: "living",
      modelUrl: "/assets/furniture/armchair-01.glb",
      thumbnailUrl: "/assets/furniture/armchair-01.webp",
      dimensions: { x: 0.9, y: 0.85, z: 0.9 },
      keywords: ["armchair"],
    });

    expect(state().activeTool).toBe("item");
    expect(state().phase).toBe("placing");
    expect(state().placingCatalogItem?.id).toBe("armchair-01");
  });

  it("setPreviewPoint keeps the snapped point available during placement", () => {
    state().beginPlacement({
      id: "bench-01",
      name: "Bench",
      category: "living",
      modelUrl: "/assets/furniture/bench-01.glb",
      thumbnailUrl: "/assets/furniture/bench-01.webp",
      dimensions: { x: 1.4, y: 0.5, z: 0.5 },
      keywords: ["bench"],
    });

    state().setPreviewPoint({ x: 4.5, z: 2.5 });

    expect(state().previewPoint).toEqual({ x: 4.5, z: 2.5 });
    expect(state().phase).toBe("placing");
  });
});

// ---------------------------------------------------------------------------
// Panels
// ---------------------------------------------------------------------------

describe("useEditor – panels", () => {
  it("default visiblePanels contains properties and levels", () => {
    expect(state().visiblePanels.has("properties")).toBe(true);
    expect(state().visiblePanels.has("levels")).toBe(true);
    expect(state().visiblePanels.size).toBe(2);
  });

  it("showPanel adds a panel", () => {
    state().showPanel("ai");
    expect(state().visiblePanels.has("ai")).toBe(true);
  });

  it("showPanel is idempotent", () => {
    state().showPanel("properties");
    state().showPanel("properties");
    expect(state().visiblePanels.has("properties")).toBe(true);
    // Set guarantees uniqueness, so size should still be 2
    expect(state().visiblePanels.size).toBe(2);
  });

  it("hidePanel removes a panel", () => {
    state().hidePanel("properties");
    expect(state().visiblePanels.has("properties")).toBe(false);
  });

  it("hidePanel is idempotent", () => {
    state().hidePanel("catalog");
    state().hidePanel("catalog");
    expect(state().visiblePanels.has("catalog")).toBe(false);
  });

  it("togglePanel adds a panel not in the set", () => {
    state().togglePanel("layers");
    expect(state().visiblePanels.has("layers")).toBe(true);
  });

  it("togglePanel removes a panel already in the set", () => {
    state().togglePanel("properties");
    expect(state().visiblePanels.has("properties")).toBe(false);
  });

  it("togglePanel twice returns to original state", () => {
    state().togglePanel("properties");
    state().togglePanel("properties");
    expect(state().visiblePanels.has("properties")).toBe(true);
  });
});
