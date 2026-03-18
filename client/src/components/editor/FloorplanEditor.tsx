import { useEffect } from "react";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { FloorplanCanvas } from "@/components/viewer/FloorplanCanvas";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { PropertyPanel } from "@/components/editor/PropertyPanel";
import { LevelNavigator } from "@/components/editor/LevelNavigator";
import { SaveIndicator } from "@/components/editor/SaveIndicator";
import { AIGeneratePanel } from "@/components/editor/AIGeneratePanel";
import { FurnitureCatalogPanel } from "@/components/editor/FurnitureCatalogPanel";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useScene, useSceneHistory } from "@/stores/use-scene";
import { useEditor } from "@/stores/use-editor";
import { useViewer } from "@/stores/use-viewer";

interface FloorplanEditorProps {
  floorplanId: number;
  floorplanName: string;
}

export function FloorplanEditor({ floorplanId: _floorplanId, floorplanName }: FloorplanEditorProps) {
  // Wire auto-save (800ms debounce)
  useAutoSave();

  // Warn before closing with unsaved changes
  const hasUnsavedChanges = useScene((s) => s.hasUnsavedChanges);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  // Keyboard shortcuts
  const setTool = useEditor((s) => s.setTool);
  const cancelAction = useEditor((s) => s.cancelAction);
  const selectedIds = useViewer((s) => s.selectedIds);
  const clearSelection = useViewer((s) => s.clearSelection);
  const deleteNode = useScene((s) => s.deleteNode);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

      const key = e.key.toLowerCase();

      if (key === "v") { setTool("select"); return; }
      if (key === "w") { setTool("wall"); return; }
      if (key === "d") { setTool("door"); return; }
      if (key === "escape") { cancelAction(); clearSelection(); return; }
      if ((key === "delete" || key === "backspace") && selectedIds.length > 0) {
        selectedIds.forEach((id) => deleteNode(id));
        clearSelection();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && key === "z" && !e.shiftKey) {
        e.preventDefault();
        useSceneHistory.getState().undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && key === "z" && e.shiftKey) {
        e.preventDefault();
        useSceneHistory.getState().redo();
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setTool, cancelAction, selectedIds, clearSelection, deleteNode]);

  const leftPanel = (
    <div className="space-y-4">
      <EditorToolbar />
      <LevelNavigator />
      <AIGeneratePanel />
      <FurnitureCatalogPanel />
    </div>
  );

  const rightPanel = <PropertyPanel />;

  return (
    <WorkspaceLayout
      leftPanel={leftPanel}
      rightPanel={rightPanel}
      title={floorplanName}
      backHref="/projects"
      headerExtra={<SaveIndicator />}
    >
      <div className="w-full h-full">
        <FloorplanCanvas />
      </div>
    </WorkspaceLayout>
  );
}
