import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchProject,
  generateIsometric,
  generate3D,
  generate3DTrellis,
  generatePascalModel,
  checkModelStatus,
  retextureModel,
  checkRetextureStatus,
  revertTexture,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useScene } from "@/stores/use-scene";
import { useViewer } from "@/stores/use-viewer";
import { useEditor } from "@/stores/use-editor";
import { PaywallModal } from "@/components/subscription";
import { useSubscription } from "@/hooks/use-subscription";
import { loadPascalScene } from "@shared/pascal-load";

import {
  WorkspaceRoot,
  type WorkspaceLayout,
} from "@/components/viewer/workspace/WorkspaceRoot";
import { TopBar } from "@/components/viewer/workspace/TopBar";
import type { ViewerMode } from "@/components/viewer/workspace/ModeSwitcher";
import { StudioStage } from "@/components/viewer/workspace/StudioStage";
import { PrecisionStage } from "@/components/viewer/workspace/PrecisionStage";
import { StatusBar } from "@/components/viewer/workspace/StatusBar";
import { GeneratePopover } from "@/components/viewer/workspace/GeneratePopover";
import { CommandPalette } from "@/components/viewer/workspace/CommandPalette";
import { FurniturePopover } from "@/components/viewer/workspace/FurniturePopover";
import { TweaksPanel } from "@/components/viewer/workspace/TweaksPanel";
import { TOOLS, type ToolId } from "@/components/viewer/workspace/tools";
import {
  toStorePreset,
  type PresetId,
} from "@/components/viewer/workspace/camera-presets";
import { cutYToWallMode } from "@/components/viewer/workspace/section-cut";
import type { StageProps } from "@/components/viewer/workspace/stage-props";

type Provider3D = "meshy" | "trellis";

export function Viewer() {
  const { id } = useParams();
  const [showPaywall, setShowPaywall] = useState(false);
  const [provider3D, setProvider3D] = useState<Provider3D>("trellis");
  const [, setProgress] = useState(0);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { invalidate: invalidateSubscription } = useSubscription();
  const { loadScene, resetSceneState } = useScene();
  const resetViewState = useViewer((state) => state.resetViewState);
  const resetEditorState = useEditor((state) => state.resetEditorState);

  const is3DGenerationStatus = (status?: string | null) =>
    status === "generating_3d" ||
    status === "generating_3d_meshy" ||
    status === "generating_3d_trellis";

  const resetPascalWorkspace = useCallback(() => {
    resetSceneState();
    resetViewState();
    resetEditorState();
  }, [resetEditorState, resetSceneState, resetViewState]);

  // New workspace-specific state
  const [layout, setLayout] = useState<WorkspaceLayout>(() => {
    try {
      const v = localStorage?.getItem?.("viewer:layout");
      return v === "precision" ? "precision" : "studio";
    } catch {
      return "studio";
    }
  });
  const persistLayout = (l: WorkspaceLayout) => {
    setLayout(l);
    try {
      localStorage.setItem("viewer:layout", l);
    } catch {}
  };

  const [mode, setMode] = useState<ViewerMode>("3d");
  const [tool, setTool] = useState<ToolId>("select");
  const [cutY, setCutYState] = useState(0);
  const [hover] = useState<{ label: string; meta: string } | null>(null);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [furnitureOpen, setFurnitureOpen] = useState(false);

  const { data: project, isLoading, refetch } = useQuery({
    queryKey: ["project", id],
    queryFn: () => fetchProject(parseInt(id || "0")),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      const model = data?.models[0];
      if (
        model?.status === "generating_pascal" ||
        model?.status === "generating_isometric" ||
        model?.status === "retexturing" ||
        is3DGenerationStatus(model?.status)
      ) {
        return 3000;
      }
      return false;
    },
  });

  const generatePascalMutation = useMutation({
    mutationFn: async (modelId: number) => {
      return generatePascalModel(modelId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      invalidateSubscription();
      toast({ title: "Pascal model generated!", description: "Geometric nodes are ready." });
      setMode("3d");
    },
    onError: (error: Error) => {
      if (
        error.message.includes("Credit limit") ||
        error.message.includes("No credits") ||
        error.message.includes("purchase more credits")
      ) {
        setShowPaywall(true);
        invalidateSubscription();
        return;
      }
      toast({ title: "Pascal Generation failed", description: error.message, variant: "destructive" });
    },
  });

  const generateIsometricMutation = useMutation({
    mutationFn: async ({ modelId, prompt }: { modelId: number; prompt?: string }) => {
      return generateIsometric(modelId, prompt);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      invalidateSubscription();
      toast({ title: "Isometric view generated!", description: "Your floorplan has been transformed." });
      setMode("3d");
    },
    onError: (error: Error) => {
      if (
        error.message.includes("Credit limit") ||
        error.message.includes("No credits") ||
        error.message.includes("purchase more credits")
      ) {
        setShowPaywall(true);
        invalidateSubscription();
        return;
      }
      toast({ title: "Generation failed", description: error.message, variant: "destructive" });
    },
  });

  const generate3DMutation = useMutation({
    mutationFn: async (modelId: number) => {
      return provider3D === "trellis" ? generate3DTrellis(modelId) : generate3D(modelId);
    },
    onSuccess: (updatedModel) => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      invalidateSubscription();
      if (updatedModel.provider === "trellis" && updatedModel.status === "completed") {
        toast({ title: "3D model ready!", description: "TRELLIS model generated successfully." });
        setMode("3d");
      } else if (provider3D === "trellis" && updatedModel.provider === "meshy") {
        toast({
          title: "TRELLIS unavailable",
          description: "Falling back to Meshy for a more reliable 3D generation run.",
        });
      } else {
        toast({ title: "3D generation started!", description: "This may take a few minutes." });
      }
    },
    onError: (error: Error) => {
      if (
        error.message.includes("Credit limit") ||
        error.message.includes("No credits") ||
        error.message.includes("purchase more credits")
      ) {
        setShowPaywall(true);
        invalidateSubscription();
        return;
      }
      toast({ title: "3D generation failed", description: error.message, variant: "destructive" });
    },
  });

  const retextureMutation = useMutation({
    mutationFn: async ({ modelId, prompt }: { modelId: number; prompt: string }) => {
      return retextureModel(modelId, prompt);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      invalidateSubscription();
      toast({ title: "Retexturing started!", description: "AI is enhancing textures..." });
    },
    onError: (error: Error) => {
      if (
        error.message.includes("Credit limit") ||
        error.message.includes("No credits") ||
        error.message.includes("purchase more credits")
      ) {
        setShowPaywall(true);
        invalidateSubscription();
        return;
      }
      toast({ title: "Retexturing failed", description: error.message, variant: "destructive" });
    },
  });

  const revertMutation = useMutation({
    mutationFn: (modelId: number) => revertTexture(modelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      toast({ title: "Reverted to original", description: "Model restored to original textures." });
      setMode("3d");
    },
    onError: (error: Error) => {
      toast({ title: "Revert failed", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    const model = project?.models[0];
    if (model?.status === "retexturing" && model.retextureTaskId) {
      const interval = setInterval(async () => {
        const updated = await checkRetextureStatus(model.id);
        if (updated.status === "completed" || updated.status === "failed") {
          clearInterval(interval);
          refetch();
          if (updated.status === "completed") {
            toast({ title: "Retexturing complete!", description: "Your model has new textures." });
            setMode("3d");
          }
        }
      }, 5000);
      return () => clearInterval(interval);
    }

    if (is3DGenerationStatus(model?.status) && model?.meshyTaskId) {
      const interval = setInterval(async () => {
        const updated = await checkModelStatus(model.id);
        if (updated.status === "completed" || updated.status === "failed") {
          clearInterval(interval);
          refetch();
          if (updated.status === "completed") {
            toast({ title: "3D model ready!", description: "Your model is complete." });
            setMode("3d");
          }
        }
      }, 5000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.models[0]?.status, project?.models[0]?.meshyTaskId, project?.models[0]?.retextureTaskId]);

  const model = project?.models[0];
  const isGenerating =
    model?.status === "generating_pascal" ||
    model?.status === "generating_isometric" ||
    model?.status === "retexturing" ||
    is3DGenerationStatus(model?.status);

  const hasPascal = !!model?.pascalData;
  const pascalLoadResult = useMemo(() => {
    if (!model?.pascalData) {
      return null;
    }

    const result = loadPascalScene(model.pascalData);
    if (result.diagnostics.length > 0) {
      console.warn("[Viewer] Pascal scene load diagnostics:", result.diagnostics);
    }
    console.log("[Viewer] Pascal load result:", {
      status: result.status,
      nodeCount: result.sceneData ? Object.keys(result.sceneData.nodes).length : 0,
      diagnosticCount: result.diagnostics.length,
    });
    return result;
  }, [model?.pascalData]);
  const hasRenderablePascal = pascalLoadResult !== null && pascalLoadResult.status !== "error";

  // Load Pascal geometry into scene store when available
  useEffect(() => {
    if (!hasPascal || !pascalLoadResult || pascalLoadResult.status === "error") {
      if (pascalLoadResult?.status === "error") {
        console.error("[Viewer] Pascal scene failed to load:", pascalLoadResult.diagnostics);
      }
      resetPascalWorkspace();
      return;
    }

    console.log(
      "[Viewer] Loading Pascal scene with",
      Object.keys(pascalLoadResult.sceneData.nodes).length,
      "nodes",
    );
    loadScene(pascalLoadResult.sceneData);
  }, [hasPascal, loadScene, pascalLoadResult, resetPascalWorkspace]);

  useEffect(() => () => resetPascalWorkspace(), [resetPascalWorkspace]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress((prev) => (prev >= 95 ? 95 : prev + Math.random() * 15));
      }, 1000);
    } else {
      setProgress(100);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Delete selected items — preserved identically from old Viewer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        const ids = useViewer.getState().selectedIds;
        if (ids.length === 0) return;
        const { deleteNode } = useScene.getState();
        ids.forEach((nodeId) => deleteNode(nodeId));
        useViewer.getState().clearSelection();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Keyboard shortcuts for workspace
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setCmdOpen((v) => !v);
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "2") {
        setMode("2d");
        return;
      }
      if (e.key === "3") {
        setMode("3d");
        return;
      }
      if (e.key === "\\") {
        setMode("split");
        return;
      }

      const upper = e.key.toUpperCase();
      const match = TOOLS.find((t) => t.k === upper);
      if (match) {
        setTool(match.id);
        if (match.id === "furniture") setFurnitureOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleCmd = (action: string) => {
    if (action.startsWith("mode:")) {
      setMode(action.slice(5) as ViewerMode);
    } else if (action.startsWith("cam:")) {
      const cid = action.slice(4) as PresetId;
      useViewer.getState().setCameraPreset(toStorePreset(cid));
    } else if (action.startsWith("layout:")) {
      persistLayout(action.slice(7) as WorkspaceLayout);
    } else if (action === "gen:pascal" && model) {
      generatePascalMutation.mutate(model.id);
    } else if (action === "gen:isometric" && model) {
      generateIsometricMutation.mutate({ modelId: model.id });
    } else if (action === "gen:3d" && model) {
      generate3DMutation.mutate(model.id);
    } else if (action === "gen:retexture" && model) {
      // No-op until the user provides a prompt via the GeneratePopover.
    }
    setCmdOpen(false);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24">
          <Skeleton className="h-12 w-64 mb-4" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-bold mb-4">Project Not Found</h1>
          <Link href="/projects">
            <Button>Back to Gallery</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  if (!model) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-bold mb-4">No models found for this project</h1>
          <Link href="/projects">
            <Button>Back to Gallery</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const Stage = layout === "precision" ? PrecisionStage : StudioStage;

  const stageProps: StageProps = {
    mode,
    tool,
    onTool: (t) => {
      setTool(t);
      if (t === "furniture") setFurnitureOpen(true);
    },
    hasPascal: hasRenderablePascal,
    modelUrl: model.model3dUrl,
    isometricUrl: model.isometricUrl,
    cutY,
    onCutY: (y) => {
      setCutYState(y);
      useViewer.getState().setWallMode(cutYToWallMode(y));
    },
    // Empty-state CTA: "empty 3D" means the user wants to generate a 3D mesh right now.
    onGenerate: () => {
      if (model) generate3DMutation.mutate(model.id);
    },
    onUndo: () => {},
    onRedo: () => {},
    hover,
  };

  const roomCount = Object.values(useScene.getState().nodes).filter(
    (n: any) => n?.type === "zone",
  ).length;

  return (
    <>
      <WorkspaceRoot layout={layout}>
        <TopBar
          projectName={project.name}
          mode={mode}
          onMode={setMode}
          onOpenCmd={() => setCmdOpen(true)}
          onExport={() => toast({ title: "Export coming soon" })}
          rightSlot={
            <GeneratePopover
              hasPascal={Boolean(model?.pascalData)}
              hasIsometric={Boolean(model?.isometricUrl)}
              has3D={Boolean(model?.model3dUrl)}
              isPascalLoading={generatePascalMutation.isPending}
              isIsometricLoading={generateIsometricMutation.isPending}
              is3DLoading={generate3DMutation.isPending}
              isRetexturing={retextureMutation.isPending}
              provider3D={provider3D}
              onProviderChange={setProvider3D}
              onPascal={() => generatePascalMutation.mutate(model.id)}
              onIsometric={(prompt) =>
                generateIsometricMutation.mutate({ modelId: model.id, prompt })
              }
              onGenerate3D={() => generate3DMutation.mutate(model.id)}
              onRetexture={(prompt) =>
                retextureMutation.mutate({ modelId: model.id, prompt })
              }
              onRevert={() => revertMutation.mutate(model.id)}
            />
          }
        />
        <Stage {...stageProps} />
        <StatusBar
          roomCount={roomCount}
          // TODO: wire triCount, fps, dims, area from the live 3D canvas
          layerCount={8}
          layerMax={8}
          version="v3.2 · draft"
        />
        <FurniturePopover
          open={furnitureOpen}
          onClose={() => {
            setFurnitureOpen(false);
            setTool("select");
          }}
        />
        <TweaksPanel layout={layout} onLayout={persistLayout} />
      </WorkspaceRoot>
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onPick={handleCmd}
      />
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => {
          setShowPaywall(false);
          invalidateSubscription();
        }}
        trigger="limit_reached"
      />
    </>
  );
}
