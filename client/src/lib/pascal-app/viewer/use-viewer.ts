import { create } from "zustand";
import type { Selection, CameraMode, LevelMode, WallMode, Theme } from "./types";

interface PascalViewerState {
  selection: Selection;
  cameraMode: CameraMode;
  levelMode: LevelMode;
  wallMode: WallMode;
  theme: Theme;
  showScans: boolean;
  showGuides: boolean;
  showGrid: boolean;
  hoveredId: string | null;

  setSelection: (sel: Partial<Selection>) => void;
  setCameraMode: (mode: CameraMode) => void;
  setLevelMode: (mode: LevelMode) => void;
  setWallMode: (mode: WallMode) => void;
  setTheme: (theme: Theme) => void;
  setShowScans: (v: boolean) => void;
  setShowGuides: (v: boolean) => void;
  setShowGrid: (v: boolean) => void;
  setHoveredId: (id: string | null) => void;
}

export const useViewer = create<PascalViewerState>((set) => ({
  selection: {
    buildingId: null,
    levelId: null,
    zoneId: null,
    selectedIds: [],
  },
  cameraMode: "perspective",
  levelMode: "stacked",
  wallMode: "up",
  theme: "light",
  showScans: true,
  showGuides: true,
  showGrid: true,
  hoveredId: null,

  setSelection: (sel) =>
    set((state) => ({
      selection: { ...state.selection, ...sel },
    })),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  setLevelMode: (mode) => set({ levelMode: mode }),
  setWallMode: (mode) => set({ wallMode: mode }),
  setTheme: (theme) => set({ theme }),
  setShowScans: (v) => set({ showScans: v }),
  setShowGuides: (v) => set({ showGuides: v }),
  setShowGrid: (v) => set({ showGrid: v }),
  setHoveredId: (id) => set({ hoveredId: id }),
}));
