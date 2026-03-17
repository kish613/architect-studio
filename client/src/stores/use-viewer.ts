import { create } from "zustand";

export type CameraMode = "perspective" | "orthographic";
export type LevelMode = "stacked" | "exploded" | "solo";
type VisibilityKey =
  | "showWalls" | "showCeilings" | "showSlabs" | "showRoofs"
  | "showItems" | "showZones" | "showGuides" | "showScans"
  | "showGrid" | "showDimensions";

interface ViewerState {
  selectedIds: string[];
  hoveredId: string | null;
  activeBuildingId: string | null;
  activeLevelId: string | null;
  activeZoneId: string | null;
  cameraMode: CameraMode;
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
  setLevelMode: (mode: LevelMode) => void;
  setSoloLevel: (levelId: string | null) => void;
  setExplodedSpacing: (spacing: number) => void;
  toggleVisibility: (key: VisibilityKey) => void;
  setVisibility: (key: VisibilityKey, visible: boolean) => void;
}

export const useViewer = create<ViewerState>((set) => ({
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

  select: (nodeIds) => set({ selectedIds: nodeIds }),
  addToSelection: (nodeId) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(nodeId) ? s.selectedIds : [...s.selectedIds, nodeId],
    })),
  removeFromSelection: (nodeId) =>
    set((s) => ({ selectedIds: s.selectedIds.filter((id) => id !== nodeId) })),
  clearSelection: () => set({ selectedIds: [] }),
  setHovered: (nodeId) => set({ hoveredId: nodeId }),
  setActiveBuilding: (id) => set({ activeBuildingId: id }),
  setActiveLevel: (id) => set({ activeLevelId: id }),
  setActiveZone: (id) => set({ activeZoneId: id }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  toggleCameraMode: () =>
    set((s) => ({ cameraMode: s.cameraMode === "perspective" ? "orthographic" : "perspective" })),
  setLevelMode: (mode) => set({ levelMode: mode }),
  setSoloLevel: (levelId) => set({ soloLevelId: levelId, levelMode: "solo" }),
  setExplodedSpacing: (spacing) => set({ explodedSpacing: spacing }),
  toggleVisibility: (key) => set((s) => ({ [key]: !s[key] })),
  setVisibility: (key, visible) => set({ [key]: visible }),
}));
