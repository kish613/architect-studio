import { useEffect } from "react";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { FloorplanCanvas } from "@/components/viewer/FloorplanCanvas";
import { BimR3FCanvas } from "@/components/bim-viewer/BimR3FCanvas";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { PropertyPanel } from "@/components/editor/PropertyPanel";
import { BimSelectionSummary } from "@/components/editor/BimSelectionSummary";
import { LevelNavigator } from "@/components/editor/LevelNavigator";
import { BimLevelNavigator } from "@/components/editor/BimLevelNavigator";
import { SaveIndicator } from "@/components/editor/SaveIndicator";
import { AIGeneratePanel } from "@/components/editor/AIGeneratePanel";
import { AIEditPanel } from "@/components/editor/AIEditPanel";
import { FurnitureCatalogPanel } from "@/components/editor/FurnitureCatalogPanel";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useBimAutoSave } from "@/hooks/use-bim-auto-save";
import { useScene, useSceneHistory } from "@/stores/use-scene";
import { useBimScene, useBimSceneHistory } from "@/stores/use-bim-scene";
import { useEditor } from "@/stores/use-editor";
import { useViewer } from "@/stores/use-viewer";

interface FloorplanEditorProps {
  floorplanId: number;
  floorplanName: string;
  /** When true, the3D view is BIM-native (canonical JSON) instead of Pascal scene nodes */
  useBimViewer?: boolean;
}

export function FloorplanEditor({
  floorplanId: _floorplanId,
  floorplanName,
  useBimViewer = false,
}: FloorplanEditorProps) {
  useAutoSave({ disabled: useBimViewer });
  useBimAutoSave({ disabled: !useBimViewer });

  const hasUnsavedChanges = useBimViewer
    ? useBimScene((s) => s.hasUnsavedChanges)
    : useScene((s) => s.hasUnsavedChanges);

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

  const setTool = useEditor((s) => s.setTool);
  const cancelAction = useEditor((s) => s.cancelAction);
  const selectedIds = useViewer((s) => s.selectedIds);
  const clearSelection = useViewer((s) => s.clearSelection);
  const deleteNode = useScene((s) => s.deleteNode);
  const deleteBim = useBimScene((s) => s.deleteById);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      if (key === "v") {
        setTool("select");
        return;
      }
      if (key === "w") {
        setTool("wall");
        return;
      }
      if (key === "d") {
        setTool("door");
        return;
      }
      if (key === "escape") {
        cancelAction();
        clearSelection();
        return;
      }
      if ((key === "delete" || key === "backspace") && selectedIds.length > 0) {
        if (useBimViewer) {
          selectedIds.forEach((id) => deleteBim(id));
        } else {
          selectedIds.forEach((id) => deleteNode(id));
        }
        clearSelection();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (useBimViewer) {
          useBimSceneHistory.getState().undo();
        } else {
          useSceneHistory.getState().undo();
        }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && key === "z" && e.shiftKey) {
        e.preventDefault();
        if (useBimViewer) {
          useBimSceneHistory.getState().redo();
        } else {
          useSceneHistory.getState().redo();
        }
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setTool, cancelAction, selectedIds, clearSelection, deleteNode, deleteBim, useBimViewer]);

  const leftPanel = (
    <div className="space-y-4">
      <EditorToolbar />
      {useBimViewer ? <BimLevelNavigator /> : <LevelNavigator />}
      <AIGeneratePanel />
      <AIEditPanel />
      <FurnitureCatalogPanel />
    </div>
  );

  const rightPanel = useBimViewer ? <BimSelectionSummary /> : <PropertyPanel />;

  return (
    <WorkspaceLayout
      leftPanel={leftPanel}
      rightPanel={rightPanel}
      title={floorplanName}
      backHref="/projects"
      headerExtra={<SaveIndicator bimMode={useBimViewer} />}
    >
      <div className="h-full w-full">
        {useBimViewer ? <BimR3FCanvas mode="editor" /> : <FloorplanCanvas />}
      </div>
    </WorkspaceLayout>
  );
}
