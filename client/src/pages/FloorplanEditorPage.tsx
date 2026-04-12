import React, { useCallback, useEffect, lazy, Suspense, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PageTransition } from "@/components/ui/page-transition";
import { useScene } from "@/stores/use-scene";
import { useBimScene } from "@/stores/use-bim-scene";
import { useViewer } from "@/stores/use-viewer";
import { useEditor } from "@/stores/use-editor";
import { fetchFloorplan } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { loadPascalScene, type PascalSceneDiagnostic } from "@shared/pascal-load";
import { PascalRecoveryPanel } from "@/components/pascal/PascalRecoveryPanel";
import { PascalRenderBoundary } from "@/components/pascal/PascalRenderBoundary";

const FloorplanEditor = lazy(() =>
  import(
    /* webpackChunkName: "floorplan-editor" */
    /* vite-chunk-name: "floorplan-editor" */
    "@/components/editor/FloorplanEditor"
  ).then((m) => ({ default: m.FloorplanEditor })),
);

function EditorLoadingFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#0A0A0A]">
      <div className="text-center">
        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-white/60">Loading floorplan editor...</p>
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

  const { resetSceneState } = useScene();
  const { reset: resetBim, loadFromCanonicalJson, loadFromPascalScene, setFloorplanId } = useBimScene();
  const resetViewState = useViewer((state) => state.resetViewState);
  const setActiveLevel = useViewer((s) => s.setActiveLevel);
  const resetEditorState = useEditor((state) => state.resetEditorState);

  const resetWorkspace = useCallback(() => {
    resetSceneState();
    resetBim();
    resetViewState();
    resetEditorState();
  }, [resetBim, resetEditorState, resetSceneState, resetViewState]);

  const loadResult = useMemo(() => {
    if (!data?.sceneData) return null;
    return loadPascalScene(data.sceneData);
  }, [data?.sceneData]);

  useEffect(() => {
    if (!data) {
      resetWorkspace();
      return;
    }

    setFloorplanId(data.id);

    if (data.canonicalJson) {
      loadFromCanonicalJson(data.canonicalJson, data.id);
      const first = useBimScene.getState().bim.levels[0];
      if (first) setActiveLevel(first.id);
      return;
    }

    if (loadResult?.status === "ok") {
      loadFromPascalScene(loadResult.sceneData, data.id);
      const first = useBimScene.getState().bim.levels[0];
      if (first) setActiveLevel(first.id);
      return;
    }

    resetWorkspace();
  }, [
    data,
    loadResult,
    loadFromCanonicalJson,
    loadFromPascalScene,
    setFloorplanId,
    setActiveLevel,
    resetWorkspace,
  ]);

  useEffect(() => () => resetWorkspace(), [resetWorkspace]);

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
                : "Floorplan data could not be loaded for the editor.",
          },
        ]
    : [];

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-white/60">Loading floorplan editor...</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <PascalRecoveryPanel
        title="Floorplan editor could not load this scene"
        description="The editor could not fetch the saved floorplan."
        diagnostics={fetchDiagnostics}
        primaryAction={{
          label: "Back to Projects",
          onClick: () => navigate("/projects"),
          variant: "outline",
        }}
      />
    );
  }

  if (!data.canonicalJson && loadResult?.status === "error") {
    return (
      <PascalRecoveryPanel
        title="Floorplan data could not be validated"
        description="The stored scene is malformed. Fix or regenerate the floorplan before opening the editor."
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
        title="Editor crashed while rendering"
        description="The editor UI hit a runtime error. The scene has been contained so the page no longer white-screens."
        onReset={resetWorkspace}
        resetKeys={[data.id, data.updatedAt ?? "", data.canonicalJson?.slice(0, 40) ?? ""]}
        primaryAction={{
          label: "Back to Projects",
          onClick: () => navigate("/projects"),
          variant: "outline",
        }}
      >
        <Suspense fallback={<EditorLoadingFallback />}>
          <FloorplanEditor
            floorplanId={data.id}
            floorplanName={data.name}
            useBimViewer
          />
        </Suspense>
      </PascalRenderBoundary>
    </PageTransition>
  );
}
