import { useViewer } from "@/stores/use-viewer";
import type { CameraMode, LevelMode } from "@/stores/use-viewer";

beforeEach(() => {
  // Reset to defaults
  useViewer.setState({
    selectedIds: [],
    hoveredId: null,
    activeBuildingId: null,
    activeLevelId: null,
    activeZoneId: null,
    cameraMode: "perspective",
    levelMode: "stacked",
    soloLevelId: null,
    explodedSpacing: 3,
    showWalls: true,
    showCeilings: true,
    showSlabs: true,
    showRoofs: true,
    showItems: true,
    showZones: true,
    showGuides: true,
    showScans: true,
    showGrid: true,
    showDimensions: true,
  });
});

function state() {
  return useViewer.getState();
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

describe("useViewer – selection", () => {
  it("select() sets selectedIds", () => {
    state().select(["a", "b"]);
    expect(state().selectedIds).toEqual(["a", "b"]);
  });

  it("addToSelection adds an id", () => {
    state().addToSelection("x");
    expect(state().selectedIds).toContain("x");
  });

  it("addToSelection prevents duplicates", () => {
    state().addToSelection("x");
    state().addToSelection("x");
    expect(state().selectedIds).toEqual(["x"]);
  });

  it("removeFromSelection removes an id", () => {
    state().select(["a", "b", "c"]);
    state().removeFromSelection("b");
    expect(state().selectedIds).toEqual(["a", "c"]);
  });

  it("clearSelection empties the array", () => {
    state().select(["a", "b"]);
    state().clearSelection();
    expect(state().selectedIds).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------

describe("useViewer – camera", () => {
  it("setCameraMode sets mode", () => {
    state().setCameraMode("orthographic");
    expect(state().cameraMode).toBe("orthographic");
  });

  it("toggleCameraMode flips perspective to orthographic", () => {
    expect(state().cameraMode).toBe("perspective");
    state().toggleCameraMode();
    expect(state().cameraMode).toBe("orthographic");
  });

  it("toggleCameraMode twice returns to original", () => {
    state().toggleCameraMode();
    state().toggleCameraMode();
    expect(state().cameraMode).toBe("perspective");
  });
});

// ---------------------------------------------------------------------------
// Level mode
// ---------------------------------------------------------------------------

describe("useViewer – level mode", () => {
  it("setLevelMode sets levelMode", () => {
    state().setLevelMode("exploded");
    expect(state().levelMode).toBe("exploded");
  });

  it("setSoloLevel sets soloLevelId AND levelMode to solo atomically", () => {
    state().setSoloLevel("level-1");
    expect(state().soloLevelId).toBe("level-1");
    expect(state().levelMode).toBe("solo");
  });

  it("setSoloLevel with null still sets levelMode to solo", () => {
    state().setSoloLevel(null);
    expect(state().soloLevelId).toBeNull();
    expect(state().levelMode).toBe("solo");
  });
});

// ---------------------------------------------------------------------------
// Visibility flags
// ---------------------------------------------------------------------------

const visibilityKeys = [
  "showWalls",
  "showCeilings",
  "showSlabs",
  "showRoofs",
  "showItems",
  "showZones",
  "showGuides",
  "showScans",
  "showGrid",
  "showDimensions",
] as const;

describe("useViewer – visibility", () => {
  it("all 10 visibility flags default to true", () => {
    for (const key of visibilityKeys) {
      expect(state()[key]).toBe(true);
    }
  });

  it("toggleVisibility flips a single flag", () => {
    state().toggleVisibility("showWalls");
    expect(state().showWalls).toBe(false);

    state().toggleVisibility("showWalls");
    expect(state().showWalls).toBe(true);
  });

  it("setVisibility sets a specific value", () => {
    state().setVisibility("showGrid", false);
    expect(state().showGrid).toBe(false);

    state().setVisibility("showGrid", true);
    expect(state().showGrid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Active context setters
// ---------------------------------------------------------------------------

describe("useViewer – active context", () => {
  it("setHovered sets hoveredId", () => {
    state().setHovered("node-1");
    expect(state().hoveredId).toBe("node-1");

    state().setHovered(null);
    expect(state().hoveredId).toBeNull();
  });

  it("setActiveBuilding sets activeBuildingId", () => {
    state().setActiveBuilding("bld-1");
    expect(state().activeBuildingId).toBe("bld-1");
  });

  it("setActiveLevel sets activeLevelId", () => {
    state().setActiveLevel("lvl-1");
    expect(state().activeLevelId).toBe("lvl-1");
  });

  it("setActiveZone sets activeZoneId", () => {
    state().setActiveZone("zone-1");
    expect(state().activeZoneId).toBe("zone-1");
  });
});
