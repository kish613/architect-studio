import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { FloorplanCanvas } from "@/components/viewer/FloorplanCanvas";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { PropertyPanel } from "@/components/editor/PropertyPanel";
import { LevelNavigator } from "@/components/editor/LevelNavigator";
import { SaveIndicator } from "@/components/editor/SaveIndicator";
import { AIGeneratePanel } from "@/components/editor/AIGeneratePanel";

interface FloorplanEditorProps {
  floorplanId: number;
  floorplanName: string;
}

export function FloorplanEditor({ floorplanId: _floorplanId, floorplanName }: FloorplanEditorProps) {
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
