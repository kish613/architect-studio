import { create } from "zustand";

export type EditorTool =
  | "select" | "wall" | "door" | "window" | "slab"
  | "ceiling" | "roof" | "zone" | "item" | "guide"
  | "scan" | "measure" | "pan" | "eraser";

export type EditorPhase = "idle" | "placing" | "drawing" | "dragging";
export type PanelId = "properties" | "levels" | "ai" | "layers" | "catalog";

interface EditorState {
  activeTool: EditorTool;
  phase: EditorPhase;
  drawingPoints: Array<{ x: number; z: number }>;
  previewPoint: { x: number; z: number } | null;
  visiblePanels: Set<PanelId>;

  setTool: (tool: EditorTool) => void;
  setPhase: (phase: EditorPhase) => void;
  cancelAction: () => void;
  addDrawingPoint: (point: { x: number; z: number }) => void;
  setPreviewPoint: (point: { x: number; z: number } | null) => void;
  clearDrawing: () => void;
  togglePanel: (panel: PanelId) => void;
  showPanel: (panel: PanelId) => void;
  hidePanel: (panel: PanelId) => void;
}

export const useEditor = create<EditorState>((set) => ({
  activeTool: "select",
  phase: "idle",
  drawingPoints: [],
  previewPoint: null,
  visiblePanels: new Set<PanelId>(["properties", "levels"]),

  setTool: (tool) => set({ activeTool: tool, phase: "idle", drawingPoints: [], previewPoint: null }),
  setPhase: (phase) => set({ phase }),
  cancelAction: () => set({ activeTool: "select", phase: "idle", drawingPoints: [], previewPoint: null }),
  addDrawingPoint: (point) =>
    set((s) => ({ drawingPoints: [...s.drawingPoints, point], phase: "drawing" })),
  setPreviewPoint: (point) => set({ previewPoint: point }),
  clearDrawing: () => set({ drawingPoints: [], previewPoint: null, phase: "idle" }),
  togglePanel: (panel) =>
    set((s) => {
      const next = new Set(s.visiblePanels);
      if (next.has(panel)) next.delete(panel); else next.add(panel);
      return { visiblePanels: next };
    }),
  showPanel: (panel) =>
    set((s) => { const next = new Set(s.visiblePanels); next.add(panel); return { visiblePanels: next }; }),
  hidePanel: (panel) =>
    set((s) => { const next = new Set(s.visiblePanels); next.delete(panel); return { visiblePanels: next }; }),
}));
