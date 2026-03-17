import { useEffect } from "react";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { FloorplanCanvas } from "@/components/viewer/FloorplanCanvas";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { PropertyPanel } from "@/components/editor/PropertyPanel";
import { LevelNavigator } from "@/components/editor/LevelNavigator";
import { SaveIndicator } from "@/components/editor/SaveIndicator";
import { AIGeneratePanel } from "@/components/editor/AIGeneratePanel";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useScene } from "@/stores/use-scene";

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

  const leftPanel = (
    <div className="space-y-4">
      <EditorToolbar />
      <LevelNavigator />
      <AIGeneratePanel />
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
