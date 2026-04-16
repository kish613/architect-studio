import { create } from "zustand";
import { useViewer as pascalUseViewer } from "@pascal-app/viewer";
import type { AnyNodeId } from "@pascal-app/core";
import { getPascalIdFromOur, getOurIdFromPascal, pascalUseScene } from "@/stores/pascal-bridge";
import type { PerformanceBudget } from "@/lib/bim/performance-budget";

export type CameraMode = "perspective" | "orthographic";
export type LevelMode = "stacked" | "exploded" | "solo";
export type WallMode = "up" | "cutaway" | "down";
type VisibilityKey =
  | "showWalls" | "showWindows" | "showCeilings" | "showSlabs" | "showRoofs"
  | "showItems" | "showZones" | "showGuides" | "showScans"
  | "showGrid" | "showDimensions";

export type CameraPreset = "perspective" | "top" | "front" | "right" | "isometric" | null;

interface ViewerState {
  selectedIds: string[];
  hoveredId: string | null;
  activeBuildingId: string | null;
  activeLevelId: string | null;
  activeZoneId: string | null;
  cameraMode: CameraMode;
  cameraPreset: CameraPreset;
  isCameraNavigating: boolean;
  levelMode: LevelMode;
  soloLevelId: string | null;
  explodedSpacing: number;
  showWalls: boolean;
  showWindows: boolean;
  showCeilings: boolean;
  showSlabs: boolean;
  showRoofs: boolean;
  showItems: boolean;
  showZones: boolean;
  showGuides: boolean;
  showScans: boolean;
  showGrid: boolean;
  showDimensions: boolean;
  wallMode: WallMode;
  theme: "dark" | "light";
  environmentPreset: string;

  // Performance budget (detected on mount)
  performanceBudget: PerformanceBudget | null;

  // Presentation mode controls
  dofEnabled: boolean;
  dofFocusDistance: number;
  autoRotateSpeed: number;

  setPerformanceBudget: (budget: PerformanceBudget) => void;
  setDofEnabled: (enabled: boolean) => void;
  setDofFocusDistance: (distance: number) => void;
  setAutoRotateSpeed: (speed: number) => void;

  select: (nodeIds: string[]) => void;
  addToSelection: (nodeId: string) => void;
  removeFromSelection: (nodeId: string) => void;
  clearSelection: () => void;
  setHovered: (nodeId: string | null) => void;
  setActiveBuilding: (id: string | null) => void;
  setActiveLevel: (id: string | null) => void;
  setActiveZone: (id: string | null) => void;
  setCameraMode: (mode: CameraMode) => void;
  toggleCameraMode: () => void;
  setCameraPreset: (preset: CameraPreset) => void;
  setCameraNavigating: (isNavigating: boolean) => void;
  setLevelMode: (mode: LevelMode) => void;
  setSoloLevel: (levelId: string | null) => void;
  setExplodedSpacing: (spacing: number) => void;
  setWallMode: (mode: WallMode) => void;
  setTheme: (theme: "dark" | "light") => void;
  toggleTheme: () => void;
  setEnvironmentPreset: (id: string) => void;
  toggleVisibility: (key: VisibilityKey) => void;
  setVisibility: (key: VisibilityKey, visible: boolean) => void;
  resetViewState: () => void;
}

// Guard flag to prevent infinite selection sync loops between our store and Pascal's.
let _syncingFromUs = false;

/**
 * Sync selection state to Pascal's viewer store.
 * Pascal uses a nested `selection` object and Pascal-prefixed IDs.
 */
function syncSelectionToPascal(
  selectedIds: string[],
  buildingId: string | null,
  levelId: string | null,
  zoneId: string | null,
): void {
  if (import.meta.env.DEV) {
    const unmappedSelected = selectedIds.filter(id => !getPascalIdFromOur(id));
    const unmappedContext = [buildingId, levelId, zoneId].filter((id): id is string => id != null && !getPascalIdFromOur(id));
    if (unmappedSelected.length > 0 || unmappedContext.length > 0) {
      console.warn('[use-viewer] syncSelectionToPascal: unmapped IDs (ID mappings not yet created?):', [...unmappedSelected, ...unmappedContext]);
    }
  }
  const pascalSelectedIds = selectedIds
    .map((id) => getPascalIdFromOur(id))
    .filter((id): id is string => id != null);
  const pascalBuildingId = buildingId ? getPascalIdFromOur(buildingId) ?? null : null;
  const pascalLevelId = levelId ? getPascalIdFromOur(levelId) ?? null : null;
  const pascalZoneId = zoneId ? getPascalIdFromOur(zoneId) ?? null : null;

  _syncingFromUs = true;
  pascalUseViewer.getState().setSelection({
    buildingId: pascalBuildingId as any,
    levelId: pascalLevelId as any,
    zoneId: pascalZoneId as any,
    selectedIds: pascalSelectedIds as any,
  });
  _syncingFromUs = false;
}

function syncCameraModeToPascal(mode: CameraMode): void {
  pascalUseViewer.getState().setCameraMode(mode);
}

function syncLevelModeToPascal(mode: LevelMode): void {
  // Pascal supports "manual" mode too; map our modes directly
  pascalUseViewer.getState().setLevelMode(mode);
}

function syncVisibilityToPascal(key: VisibilityKey, value: boolean): void {
  const pv = pascalUseViewer.getState();
  if (key === "showScans") { pv.setShowScans(value); return; }
  if (key === "showGuides") { pv.setShowGuides(value); return; }
  if (key === "showGrid") { pv.setShowGrid(value); return; }

  // For node-type visibility, batch-update `visible` on matching nodes in Pascal's scene store
  const typeMap: Record<string, string> = {
    showWalls: "wall",
    showWindows: "window",
    showSlabs: "slab",
    showCeilings: "ceiling",
    showRoofs: "roof",
    showItems: "item",
    showZones: "zone",
  };
  const nodeType = typeMap[key];
  if (!nodeType) return;

  const sceneStore = pascalUseScene.getState();
  const updates: Array<{ id: AnyNodeId; data: { visible: boolean } }> = [];
  for (const node of Object.values(sceneStore.nodes)) {
    if (node.type === nodeType) {
      updates.push({ id: node.id as AnyNodeId, data: { visible: value } });
    }
  }
  if (updates.length > 0) {
    sceneStore.updateNodes(updates);
  }
}

function syncWallModeToPascal(mode: WallMode): void {
  pascalUseViewer.getState().setWallMode(mode);
}

function syncHoveredToPascal(id: string | null): void {
  const pascalId = id ? getPascalIdFromOur(id) ?? null : null;
  pascalUseViewer.getState().setHoveredId(pascalId as any);
}

export const useViewer = create<ViewerState>((set, get) => ({
  selectedIds: [],
  hoveredId: null,
  activeBuildingId: null,
  activeLevelId: null,
  activeZoneId: null,
  cameraMode: "perspective",
  cameraPreset: null,
  isCameraNavigating: false,
  levelMode: "stacked",
  soloLevelId: null,
  explodedSpacing: 3,
  showWalls: true,
  showWindows: true,
  showCeilings: true,
  showSlabs: true,
  showRoofs: true,
  showItems: true,
  showZones: true,
  showGuides: true,
  showScans: true,
  showGrid: true,
  showDimensions: true,
  wallMode: "up",
  theme: "light",
  environmentPreset: "daylight",

  performanceBudget: null,
  dofEnabled: true,
  dofFocusDistance: 0.02,
  autoRotateSpeed: 0,

  setPerformanceBudget: (budget) => set({ performanceBudget: budget }),
  setDofEnabled: (enabled) => set({ dofEnabled: enabled }),
  setDofFocusDistance: (distance) => set({ dofFocusDistance: distance }),
  setAutoRotateSpeed: (speed) => set({ autoRotateSpeed: speed }),

  select: (nodeIds) => {
    set({ selectedIds: nodeIds });
    const s = get();
    syncSelectionToPascal(nodeIds, s.activeBuildingId, s.activeLevelId, s.activeZoneId);
  },
  addToSelection: (nodeId) =>
    set((s) => {
      const selectedIds = s.selectedIds.includes(nodeId) ? s.selectedIds : [...s.selectedIds, nodeId];
      syncSelectionToPascal(selectedIds, s.activeBuildingId, s.activeLevelId, s.activeZoneId);
      return { selectedIds };
    }),
  removeFromSelection: (nodeId) =>
    set((s) => {
      const selectedIds = s.selectedIds.filter((id) => id !== nodeId);
      syncSelectionToPascal(selectedIds, s.activeBuildingId, s.activeLevelId, s.activeZoneId);
      return { selectedIds };
    }),
  clearSelection: () => {
    set({ selectedIds: [] });
    const s = get();
    syncSelectionToPascal([], s.activeBuildingId, s.activeLevelId, s.activeZoneId);
  },
  setHovered: (nodeId) => {
    set({ hoveredId: nodeId });
    syncHoveredToPascal(nodeId);
  },
  setActiveBuilding: (id) => {
    set({ activeBuildingId: id });
    const s = get();
    syncSelectionToPascal(s.selectedIds, id, s.activeLevelId, s.activeZoneId);
  },
  setActiveLevel: (id) => {
    set({ activeLevelId: id });
    const s = get();
    syncSelectionToPascal(s.selectedIds, s.activeBuildingId, id, s.activeZoneId);
  },
  setActiveZone: (id) => {
    set({ activeZoneId: id });
    const s = get();
    syncSelectionToPascal(s.selectedIds, s.activeBuildingId, s.activeLevelId, id);
  },
  setCameraMode: (mode) => {
    set({ cameraMode: mode });
    syncCameraModeToPascal(mode);
  },
  toggleCameraMode: () =>
    set((s) => {
      const mode = s.cameraMode === "perspective" ? "orthographic" : "perspective";
      syncCameraModeToPascal(mode);
      return { cameraMode: mode };
    }),
  setCameraPreset: (preset) => set({ cameraPreset: preset }),
  setCameraNavigating: (isNavigating) => set({ isCameraNavigating: isNavigating }),
  setLevelMode: (mode) => {
    set({ levelMode: mode });
    syncLevelModeToPascal(mode);
  },
  setSoloLevel: (levelId) => {
    set({ soloLevelId: levelId, levelMode: "solo" });
    syncLevelModeToPascal("solo");
    const s = get();
    syncSelectionToPascal(s.selectedIds, s.activeBuildingId, levelId, s.activeZoneId);
  },
  setExplodedSpacing: (spacing) => set({ explodedSpacing: spacing }),
  setWallMode: (mode) => {
    set({ wallMode: mode });
    syncWallModeToPascal(mode);
  },
  setTheme: (theme) => {
    set({ theme });
    pascalUseViewer.getState().setTheme(theme);
  },
  toggleTheme: () => {
    const next = get().theme === "light" ? "dark" : "light";
    set({ theme: next });
    pascalUseViewer.getState().setTheme(next);
  },
  setEnvironmentPreset: (id) => set({ environmentPreset: id }),
  toggleVisibility: (key) =>
    set((s) => {
      const newVal = !s[key];
      syncVisibilityToPascal(key, newVal);
      return { [key]: newVal } as Record<string, boolean>;
    }),
  setVisibility: (key, visible) => {
    set({ [key]: visible } as Record<string, boolean>);
    syncVisibilityToPascal(key, visible);
  },
  resetViewState: () =>
    set({
      selectedIds: [],
      hoveredId: null,
      activeBuildingId: null,
      activeLevelId: null,
      activeZoneId: null,
      cameraMode: "perspective",
      cameraPreset: null,
      isCameraNavigating: false,
      levelMode: "stacked",
      soloLevelId: null,
      explodedSpacing: 3,
      showWalls: true,
      showWindows: true,
      showCeilings: true,
      showSlabs: true,
      showRoofs: true,
      showItems: true,
      showZones: true,
      showGuides: true,
      showScans: true,
      showGrid: true,
      showDimensions: true,
      wallMode: "up",
      theme: "light",
      environmentPreset: "daylight",
      // Keep performanceBudget — it's a hardware property, not user state
      dofEnabled: true,
      dofFocusDistance: 0.02,
      autoRotateSpeed: 0,
    }),
}));

/**
 * Subscribe to Pascal's viewer store selection changes and reflect them
 * back into our store. Returns an unsubscribe function.
 *
 * This creates the "Pascal -> Our Store" half of bidirectional selection sync.
 * The "Our Store -> Pascal" half is handled by `syncSelectionToPascal` above,
 * guarded by the `_syncingFromUs` flag to prevent infinite loops.
 */
export function initPascalSelectionSync(): () => void {
  const unsub = pascalUseViewer.subscribe((state, prevState) => {
    if (_syncingFromUs) return;

    const pascalIds = state.selection.selectedIds;
    const prevPascalIds = prevState.selection.selectedIds;

    // Only act when the selected IDs actually changed
    if (pascalIds === prevPascalIds) return;

    // Translate Pascal IDs back to our UUIDs
    const ourIds = pascalIds
      .map((pid: string) => getOurIdFromPascal(pid))
      .filter((id): id is string => id != null);

    // Update our store without triggering a sync back to Pascal
    useViewer.setState({ selectedIds: ourIds });
  });
  return unsub;
}
