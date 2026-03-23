import React, { useCallback, useEffect, lazy, Suspense, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PageTransition } from "@/components/ui/page-transition";
import { useScene } from "@/stores/use-scene";
import { useViewer } from "@/stores/use-viewer";
import { useEditor } from "@/stores/use-editor";
import { fetchFloorplan } from "@/lib/api";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  loadPascalScene,
  type PascalSceneDiagnostic,
} from "@shared/pascal-load";
import { PascalRecoveryPanel } from "@/components/pascal/PascalRecoveryPanel";
import { PascalRenderBoundary } from "@/components/pascal/PascalRenderBoundary";

const FloorplanEditor = lazy(() =>
  import(
    /* webpackChunkName: "floorplan-editor" */
    /* vite-chunk-name: "floorplan-editor" */
    "@/components/editor/FloorplanEditor"
  ).then((m) => ({ default: m.FloorplanEditor }))
);

function EditorLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen bg-[#0A0A0A]">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
        <p className="text-white/60 text-sm">Loading floorplan editor...</p>
      </div>
    </div>
  );
}

export function FloorplanEditorPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = Number(params.id);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["floorplan", id],
    queryFn: () => fetchFloorplan(id),
    enabled: !!id,
  });

  const { setFloorplanId, loadScene, resetSceneState } = useScene();
  const resetViewState = useViewer((state) => state.resetViewState);
  const resetEditorState = useEditor((state) => state.resetEditorState);

  const resetPascalWorkspace = useCallback(() => {
    resetSceneState();
    resetViewState();
    resetEditorState();
  }, [resetEditorState, resetSceneState, resetViewState]);

  const loadResult = useMemo(() => {
    if (!data?.sceneData) {
      return null;
    }

    return loadPascalScene(data.sceneData);
  }, [data?.sceneData]);

  useEffect(() => {
    if (!data || !loadResult || loadResult.status === "error") {
      resetPascalWorkspace();
      return;
    }

    setFloorplanId(data.id);
    loadScene(loadResult.sceneData, data.id);
  }, [data, loadResult, setFloorplanId, loadScene, resetPascalWorkspace]);

  useEffect(() => () => resetPascalWorkspace(), [resetPascalWorkspace]);

  const fetchDiagnostics: PascalSceneDiagnostic[] = isError
    ? Array.isArray((error as Error & { diagnostics?: unknown }).diagnostics)
      ? ((error as Error & { diagnostics?: PascalSceneDiagnostic[] }).diagnostics ?? [])
      : [
          {
            stage: "fetch",
            code: "floorplan-fetch-failed",
            message:
              error instanceof Error
                ? error.message
                : "Floorplan data could not be loaded for the Pascal editor.",
          },
        ]
    : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0A0A0A]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-white/60 text-sm">Loading floorplan editor...</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <PascalRecoveryPanel
        title="Floorplan editor could not load this scene"
        description="The editor could not fetch the saved Pascal floorplan. You can go back safely and reopen the project after the data issue is resolved."
        diagnostics={fetchDiagnostics}
        primaryAction={{
          label: "Back to Projects",
          onClick: () => navigate("/projects"),
          variant: "outline",
        }}
      />
    );
  }

  if (loadResult?.status === "error") {
    return (
      <PascalRecoveryPanel
        title="Pascal scene could not be validated"
        description="The stored floorplan scene is malformed or incomplete, so the editor did not mount the canvas. Fix or regenerate the scene before reopening it here."
        diagnostics={loadResult.diagnostics}
        primaryAction={{
          label: "Back to Projects",
          onClick: () => navigate("/projects"),
          variant: "outline",
        }}
      />
    );
  }

  return (
    <PageTransition>
      <PascalRenderBoundary
        title="Pascal editor crashed while rendering"
        description="The editor UI hit a runtime error while mounting this floorplan. The scene has been contained so the page no longer white-screens."
        onReset={resetPascalWorkspace}
        resetKeys={[data.id, data.updatedAt]}
        primaryAction={{
          label: "Back to Projects",
          onClick: () => navigate("/projects"),
          variant: "outline",
        }}
      >
        <Suspense fallback={<EditorLoadingFallback />}>
          <FloorplanEditor floorplanId={data.id} floorplanName={data.name} />
        </Suspense>
      </PascalRenderBoundary>
    </PageTransition>
  );
}
