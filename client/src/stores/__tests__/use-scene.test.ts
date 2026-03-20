import { vi } from "vitest";
import { useScene } from "@/stores/use-scene";
import { useViewer } from "@/stores/use-viewer";
import { createEmptyScene, createNode } from "@/lib/pascal/schemas";
import { eventBus } from "@/lib/pascal/event-bus";

beforeEach(() => {
  useScene.getState().loadScene(createEmptyScene());
  useViewer.setState({
    selectedIds: [],
    hoveredId: null,
    activeBuildingId: null,
    activeLevelId: null,
    activeZoneId: null,
    cameraMode: "perspective",
    cameraPreset: null,
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
  eventBus.clear();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function state() {
  return useScene.getState();
}

function nodeIds() {
  return Object.keys(state().nodes);
}

function makeWall(overrides: Record<string, unknown> = {}) {
  return createNode("wall", {
    start: { x: 0, y: 0, z: 0 },
    end: { x: 5, y: 0, z: 0 },
    ...overrides,
  } as any);
}

// ---------------------------------------------------------------------------
// Initial state after loadScene
// ---------------------------------------------------------------------------

describe("useScene – initial state", () => {
  it("has 3 nodes (site, building, level)", () => {
    expect(nodeIds()).toHaveLength(3);
  });

  it("has exactly 1 rootNodeId", () => {
    expect(state().rootNodeIds).toHaveLength(1);
  });

  it("rootNodeId points to a site node", () => {
    const rootId = state().rootNodeIds[0];
    expect(state().nodes[rootId].type).toBe("site");
  });

  it("has empty dirtyNodeIds", () => {
    expect(state().dirtyNodeIds.size).toBe(0);
  });

  it("hasUnsavedChanges is false", () => {
    expect(state().hasUnsavedChanges).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// addNode
// ---------------------------------------------------------------------------

describe("useScene – addNode", () => {
  it("adds a root node to nodes and rootNodeIds", () => {
    const wall = makeWall();
    state().addNode(wall);

    expect(state().nodes[wall.id]).toBeDefined();
    expect(state().rootNodeIds).toContain(wall.id);
  });

  it("emits node:created event", () => {
    const spy = vi.fn();
    eventBus.on("node:created", spy);

    const wall = makeWall();
    state().addNode(wall);

    expect(spy).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith({ node: wall });
  });

  it("marks the new node as dirty", () => {
    const wall = makeWall();
    state().addNode(wall);

    expect(state().dirtyNodeIds.has(wall.id)).toBe(true);
  });

  it("sets hasUnsavedChanges to true", () => {
    const wall = makeWall();
    state().addNode(wall);

    expect(state().hasUnsavedChanges).toBe(true);
  });

  it("adds a child node: parent.childIds updated, not in rootNodeIds", () => {
    const siteId = state().rootNodeIds[0];
    const wall = makeWall({ parentId: siteId });
    state().addNode(wall, siteId);

    expect(state().nodes[siteId].childIds).toContain(wall.id);
    expect(state().rootNodeIds).not.toContain(wall.id);
    expect(state().nodes[wall.id]).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// updateNode
// ---------------------------------------------------------------------------

describe("useScene – updateNode", () => {
  it("merges changes into the node", () => {
    const wall = makeWall();
    state().addNode(wall);
    state().updateNode(wall.id, { name: "Updated Wall" } as any);

    expect(state().nodes[wall.id].name).toBe("Updated Wall");
  });

  it("preserves the original type even if changes include a different type", () => {
    const wall = makeWall();
    state().addNode(wall);
    state().updateNode(wall.id, { type: "zone" } as any);

    expect(state().nodes[wall.id].type).toBe("wall");
  });

  it("emits node:updated event", () => {
    const wall = makeWall();
    state().addNode(wall);

    const spy = vi.fn();
    eventBus.on("node:updated", spy);

    state().updateNode(wall.id, { name: "New Name" } as any);

    expect(spy).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith({ nodeId: wall.id, changes: { name: "New Name" } });
  });

  it("marks the node as dirty", () => {
    const wall = makeWall();
    state().addNode(wall);
    state().clearDirty();

    state().updateNode(wall.id, { name: "Renamed" } as any);
    expect(state().dirtyNodeIds.has(wall.id)).toBe(true);
  });

  it("no-ops on a missing node", () => {
    const before = { ...state().nodes };
    state().updateNode("nonexistent-id", { name: "Ghost" } as any);
    expect(state().nodes).toEqual(before);
  });

  it("can apply multiple node updates in a single transaction", () => {
    const wall = makeWall();
    const siteId = state().rootNodeIds[0];
    state().addNode(wall, siteId);
    state().clearDirty();

    state().applyNodeUpdates({
      [siteId]: { name: "Styled Site" } as any,
      [wall.id]: { finishId: "wall-brick", finishVariantId: "heritage" } as any,
    });

    expect(state().nodes[siteId].name).toBe("Styled Site");
    expect((state().nodes[wall.id] as any).finishId).toBe("wall-brick");
    expect(state().dirtyNodeIds.has(siteId)).toBe(true);
    expect(state().dirtyNodeIds.has(wall.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// deleteNode
// ---------------------------------------------------------------------------

describe("useScene – deleteNode", () => {
  it("removes the node from nodes", () => {
    const wall = makeWall();
    state().addNode(wall);
    state().deleteNode(wall.id);

    expect(state().nodes[wall.id]).toBeUndefined();
  });

  it("removes the node from rootNodeIds", () => {
    const wall = makeWall();
    state().addNode(wall);
    state().deleteNode(wall.id);

    expect(state().rootNodeIds).not.toContain(wall.id);
  });

  it("cascades deletion to children", () => {
    const siteId = state().rootNodeIds[0];
    const site = state().nodes[siteId];
    const buildingId = site.childIds[0];

    // Delete site -> should also remove building + level
    const childCountBefore = nodeIds().length;
    expect(childCountBefore).toBe(3);

    state().deleteNode(siteId);

    expect(nodeIds()).toHaveLength(0);
  });

  it("cleans up parent.childIds when deleting a child", () => {
    const siteId = state().rootNodeIds[0];
    const buildingId = state().nodes[siteId].childIds[0];

    const wall = makeWall({ parentId: buildingId });
    state().addNode(wall, buildingId);

    expect(state().nodes[buildingId].childIds).toContain(wall.id);

    state().deleteNode(wall.id);

    expect(state().nodes[buildingId].childIds).not.toContain(wall.id);
  });

  it("emits node:deleted event", () => {
    const wall = makeWall();
    state().addNode(wall);

    const spy = vi.fn();
    eventBus.on("node:deleted", spy);

    state().deleteNode(wall.id);

    expect(spy).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith({ nodeId: wall.id, type: "wall" });
  });

  it("marks all deleted IDs as dirty", () => {
    const siteId = state().rootNodeIds[0];
    const buildingId = state().nodes[siteId].childIds[0];
    const levelId = state().nodes[buildingId].childIds[0];

    state().clearDirty();
    state().deleteNode(siteId);

    expect(state().dirtyNodeIds.has(siteId)).toBe(true);
    expect(state().dirtyNodeIds.has(buildingId)).toBe(true);
    expect(state().dirtyNodeIds.has(levelId)).toBe(true);
  });

  it("no-ops on a missing node", () => {
    const before = nodeIds().length;
    state().deleteNode("nonexistent-id");
    expect(nodeIds()).toHaveLength(before);
  });
});

// ---------------------------------------------------------------------------
// moveNode
// ---------------------------------------------------------------------------

describe("useScene – moveNode", () => {
  it("reparents a node", () => {
    const siteId = state().rootNodeIds[0];
    const buildingId = state().nodes[siteId].childIds[0];
    const levelId = state().nodes[buildingId].childIds[0];

    // Move level from building to site
    state().moveNode(levelId, siteId);

    expect(state().nodes[levelId].parentId).toBe(siteId);
    expect(state().nodes[siteId].childIds).toContain(levelId);
  });

  it("removes node from old parent.childIds", () => {
    const siteId = state().rootNodeIds[0];
    const buildingId = state().nodes[siteId].childIds[0];
    const levelId = state().nodes[buildingId].childIds[0];

    state().moveNode(levelId, siteId);

    expect(state().nodes[buildingId].childIds).not.toContain(levelId);
  });

  it("removes node from rootNodeIds if it was a root", () => {
    const wall = makeWall();
    state().addNode(wall); // root
    expect(state().rootNodeIds).toContain(wall.id);

    const siteId = state().rootNodeIds[0];
    state().moveNode(wall.id, siteId);

    expect(state().rootNodeIds).not.toContain(wall.id);
  });

  it("marks both node and new parent as dirty", () => {
    const siteId = state().rootNodeIds[0];
    const buildingId = state().nodes[siteId].childIds[0];
    const levelId = state().nodes[buildingId].childIds[0];

    state().clearDirty();
    state().moveNode(levelId, siteId);

    expect(state().dirtyNodeIds.has(levelId)).toBe(true);
    expect(state().dirtyNodeIds.has(siteId)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// loadScene
// ---------------------------------------------------------------------------

describe("useScene – loadScene", () => {
  it("replaces all nodes with provided data", () => {
    const scene = createEmptyScene();
    state().addNode(makeWall()); // extra node

    state().loadScene(scene);
    expect(nodeIds()).toHaveLength(3);
  });

  it("clears dirtyNodeIds", () => {
    state().markDirty("some-id");
    state().loadScene(createEmptyScene());
    expect(state().dirtyNodeIds.size).toBe(0);
  });

  it("sets hasUnsavedChanges to false", () => {
    state().addNode(makeWall());
    expect(state().hasUnsavedChanges).toBe(true);

    state().loadScene(createEmptyScene());
    expect(state().hasUnsavedChanges).toBe(false);
  });

  it("emits scene:loaded with correct nodeCount", () => {
    const spy = vi.fn();
    eventBus.on("scene:loaded", spy);

    const scene = createEmptyScene();
    state().loadScene(scene);

    expect(spy).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith({ nodeCount: 3 });
  });

  it("sets floorplanId when provided", () => {
    state().loadScene(createEmptyScene(), 42);
    expect(state().floorplanId).toBe(42);
  });

  it("sets floorplanId to null when not provided", () => {
    state().setFloorplanId(99);
    state().loadScene(createEmptyScene());
    expect(state().floorplanId).toBeNull();
  });

  it("initializes active building and level context from the loaded scene", () => {
    const scene = createEmptyScene();

    state().loadScene(scene);

    const siteId = scene.rootNodeIds[0];
    const buildingId = scene.nodes[siteId].childIds[0];
    const levelId = scene.nodes[buildingId].childIds[0];

    expect(useViewer.getState().activeBuildingId).toBe(buildingId);
    expect(useViewer.getState().activeLevelId).toBe(levelId);
  });
});

// ---------------------------------------------------------------------------
// Dirty tracking helpers
// ---------------------------------------------------------------------------

describe("useScene – dirty tracking", () => {
  it("markDirty adds a nodeId to dirtyNodeIds", () => {
    state().markDirty("abc");
    expect(state().dirtyNodeIds.has("abc")).toBe(true);
  });

  it("markDirty sets hasUnsavedChanges", () => {
    state().markDirty("abc");
    expect(state().hasUnsavedChanges).toBe(true);
  });

  it("clearDirty empties dirtyNodeIds", () => {
    state().markDirty("abc");
    state().clearDirty();
    expect(state().dirtyNodeIds.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

describe("useScene – persistence helpers", () => {
  it("setFloorplanId updates floorplanId", () => {
    state().setFloorplanId(7);
    expect(state().floorplanId).toBe(7);
  });

  it("setSaving updates isSaving", () => {
    state().setSaving(true);
    expect(state().isSaving).toBe(true);

    state().setSaving(false);
    expect(state().isSaving).toBe(false);
  });

  it("markSaved sets lastSavedAt, clears unsaved + saving", () => {
    state().addNode(makeWall());
    state().setSaving(true);

    const before = Date.now();
    state().markSaved();

    expect(state().hasUnsavedChanges).toBe(false);
    expect(state().isSaving).toBe(false);
    expect(state().lastSavedAt).toBeGreaterThanOrEqual(before);
  });
});
