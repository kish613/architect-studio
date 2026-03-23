import { create } from "zustand";

export type CameraMode = "perspective" | "orthographic";
export type LevelMode = "stacked" | "exploded" | "solo";
export type WallMode = "up" | "cutaway" | "down";
type VisibilityKey =
  | "showWalls" | "showCeilings" | "showSlabs" | "showRoofs"
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
  levelMode: LevelMode;
  soloLevelId: string | null;
  explodedSpacing: number;
  showWalls: boolean;
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
  setLevelMode: (mode: LevelMode) => void;
  setSoloLevel: (levelId: string | null) => void;
  setExplodedSpacing: (spacing: number) => void;
  setWallMode: (mode: WallMode) => void;
  setTheme: (theme: "dark" | "light") => void;
  toggleTheme: () => void;
  toggleVisibility: (key: VisibilityKey) => void;
  setVisibility: (key: VisibilityKey, visible: boolean) => void;
}

// Sync stubs — the local SceneRenderer reads directly from useScene/useViewer,
// so there's no external store to push state into.
function syncSelectionToPascal(
  _selectedIds: string[],
  _buildingId: string | null,
  _levelId: string | null,
  _zoneId: string | null,
): void {}

function syncCameraModeToPascal(_mode: CameraMode): void {}
function syncLevelModeToPascal(_mode: LevelMode): void {}
function syncVisibilityToPascal(_key: VisibilityKey, _value: boolean): void {}
function syncWallModeToPascal(_mode: WallMode): void {}
function syncHoveredToPascal(_id: string | null): void {}

export const useViewer = create<ViewerState>((set, get) => ({
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
  wallMode: "up",
  theme: "light",

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
  },
  toggleTheme: () => {
    const next = get().theme === "light" ? "dark" : "light";
    set({ theme: next });
  },
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
}));

/**
 * No-op — there is no external Pascal viewer store to subscribe to.
 * Selection is managed entirely within our local useViewer store.
 */
export function initPascalSelectionSync(): () => void {
  return () => {};
}
