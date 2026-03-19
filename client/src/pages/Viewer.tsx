import { useParams, Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Share2, Loader2, Sparkles, Box, RotateCw, Check, Paintbrush, Undo2, ZoomIn, ZoomOut, Expand, Layers, Eye, ArrowUp, ArrowRight, Grid3x3, SlidersHorizontal } from "lucide-react";
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchProject, generateIsometric, generate3D, generate3DTrellis, generatePascalModel, checkModelStatus, retextureModel, checkRetextureStatus, revertTexture } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Model3DViewer, Model3DPlaceholder } from "@/components/viewer/Model3DViewer";
import { FloorplanCanvas } from "@/components/viewer/FloorplanCanvas";
import { useScene } from "@/stores/use-scene";
import { PaywallModal } from "@/components/subscription";
import { useSubscription } from "@/hooks/use-subscription";
import { useViewer } from "@/stores/use-viewer";
import { PageTransition } from "@/components/ui/page-transition";
import { FurnitureCatalogPanel } from "@/components/editor/FurnitureCatalogPanel";

type ViewMode = 'original' | 'isometric' | '3d' | 'split';
type Provider3D = 'meshy' | 'trellis';
type ToolMode = 'pascal' | 'isometric' | '3d' | 'texture';

// Scene control sub-components
function VisibilityToggle({ storeKey, label }: { storeKey: "showWalls" | "showSlabs" | "showRoofs" | "showItems" | "showZones" | "showGrid"; label: string }) {
  const value = useViewer((s) => s[storeKey]);
  const toggle = useViewer((s) => s.toggleVisibility);
  return (
    <button
      onClick={() => toggle(storeKey)}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] transition-all ${value ? 'bg-white/10 text-white border border-white/10' : 'bg-black/20 text-white/40 border border-transparent hover:bg-white/5'}`}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${value ? 'bg-emerald-400' : 'bg-white/20'}`} />
      {label}
    </button>
  );
}

function CameraPresetButton({ preset, Icon, label }: { preset: string; Icon: React.ComponentType<{ className?: string }>; label: string }) {
  const setCameraPreset = useViewer((s) => s.setCameraPreset);
  return (
    <button
      onClick={() => setCameraPreset(preset as any)}
      className="flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg bg-black/20 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all text-white/60 hover:text-white"
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="text-[9px]">{label}</span>
    </button>
  );
}

function ExplodedViewControl() {
  const levelMode = useViewer((s) => s.levelMode);
  const setLevelMode = useViewer((s) => s.setLevelMode);
  const explodedSpacing = useViewer((s) => s.explodedSpacing);
  const setExplodedSpacing = useViewer((s) => s.setExplodedSpacing);
  const isExploded = levelMode === "exploded";
  return (
    <div className="space-y-2">
      <button
        onClick={() => setLevelMode(isExploded ? "stacked" : "exploded")}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] transition-all ${isExploded ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-black/20 text-white/50 border border-transparent hover:bg-white/5'}`}
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        {isExploded ? 'Collapse Levels' : 'Explode Levels'}
      </button>
      {isExploded && (
        <input
          type="range"
          min={0}
          max={10}
          step={0.5}
          value={explodedSpacing}
          onChange={(e) => setExplodedSpacing(parseFloat(e.target.value))}
          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
      )}
    </div>
  );
}

const ViewZoomControls = () => {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className="absolute bottom-6 right-6 flex gap-2 z-50 bg-black/50 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
      <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => zoomIn()}>
        <ZoomIn className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => zoomOut()}>
        <ZoomOut className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => resetTransform()}>
        <Expand className="w-4 h-4" />
      </Button>
    </div>
  );
};

export function Viewer() {
  const { id } = useParams();
  const [viewMode, setViewMode] = useState<ViewMode>('original');
  const [activeTool, setActiveTool] = useState<ToolMode>('pascal');
  const [customPrompt, setCustomPrompt] = useState("");
  const [texturePrompt, setTexturePrompt] = useState("");
  const [showPaywall, setShowPaywall] = useState(false);
  const [provider3D, setProvider3D] = useState<Provider3D>('trellis');
  const [progress, setProgress] = useState(0);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { subscription, invalidate: invalidateSubscription } = useSubscription();
  const { loadScene } = useScene();
  const is3DGenerationStatus = (status?: string | null) =>
    status === "generating_3d" ||
    status === "generating_3d_meshy" ||
    status === "generating_3d_trellis";

  const { data: project, isLoading, refetch } = useQuery({
    queryKey: ['project', id],
    queryFn: () => fetchProject(parseInt(id || '0')),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      const model = data?.models[0];
      if (
        model?.status === 'generating_pascal' ||
        model?.status === 'generating_isometric' ||
        model?.status === 'retexturing' ||
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
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      invalidateSubscription();
      toast({ title: "Pascal model generated!", description: "Geometric nodes are ready." });
      setViewMode('3d');
      setActiveTool('3d');
    },
    onError: (error: Error) => {
      if (error.message.includes("Credit limit") || error.message.includes("No credits") || error.message.includes("purchase more credits")) {
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
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      invalidateSubscription();
      toast({ title: "Isometric view generated!", description: "Your floorplan has been transformed." });
      setViewMode('isometric');
      setActiveTool('3d');
    },
    onError: (error: Error) => {
      if (error.message.includes("Credit limit") || error.message.includes("No credits") || error.message.includes("purchase more credits")) {
        setShowPaywall(true);
        invalidateSubscription();
        return;
      }
      toast({ title: "Generation failed", description: error.message, variant: "destructive" });
    },
  });

  const generate3DMutation = useMutation({
    mutationFn: async (modelId: number) => {
      return provider3D === 'trellis' ? generate3DTrellis(modelId) : generate3D(modelId);
    },
    onSuccess: (updatedModel) => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      invalidateSubscription();
      if (updatedModel.provider === 'trellis' && updatedModel.status === 'completed') {
        toast({ title: "3D model ready!", description: "TRELLIS model generated successfully." });
        setViewMode('3d');
        setActiveTool('texture');
      } else if (provider3D === 'trellis' && updatedModel.provider === 'meshy') {
        toast({ title: "TRELLIS unavailable", description: "Falling back to Meshy for a more reliable 3D generation run." });
      } else {
        toast({ title: "3D generation started!", description: "This may take a few minutes." });
      }
    },
    onError: (error: Error) => {
      if (error.message.includes("Credit limit") || error.message.includes("No credits") || error.message.includes("purchase more credits")) {
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
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      invalidateSubscription();
      toast({ title: "Retexturing started!", description: "AI is enhancing textures..." });
    },
    onError: (error: Error) => {
      if (error.message.includes("Credit limit") || error.message.includes("No credits") || error.message.includes("purchase more credits")) {
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
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      toast({ title: "Reverted to original", description: "Model restored to original textures." });
      setViewMode('3d');
    },
    onError: (error: Error) => {
      toast({ title: "Revert failed", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    const model = project?.models[0];
    if (model?.status === 'retexturing' && model.retextureTaskId) {
      const interval = setInterval(async () => {
        const updated = await checkRetextureStatus(model.id);
        if (updated.status === 'completed' || updated.status === 'failed') {
          clearInterval(interval);
          refetch();
          if (updated.status === 'completed') {
            toast({ title: "Retexturing complete!", description: "Your model has new textures." });
            setViewMode('3d');
          }
        }
      }, 5000);
      return () => clearInterval(interval);
    }

    if (is3DGenerationStatus(model?.status) && model.meshyTaskId) {
      const interval = setInterval(async () => {
        const updated = await checkModelStatus(model.id);
        if (updated.status === 'completed' || updated.status === 'failed') {
          clearInterval(interval);
          refetch();
          if (updated.status === 'completed') {
            toast({ title: "3D model ready!", description: "Your model is complete." });
            setViewMode('3d');
            setActiveTool('texture');
          }
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [project?.models[0]?.status, project?.models[0]?.meshyTaskId, project?.models[0]?.retextureTaskId]);

  const model = project?.models[0];
  const isGenerating =
    model?.status === 'generating_pascal' ||
    model?.status === 'generating_isometric' ||
    model?.status === 'retexturing' ||
    is3DGenerationStatus(model?.status);
  const hasIsometric = !!model?.isometricUrl;
  const has3D = !!model?.model3dUrl;
  const hasPascal = !!model?.pascalData;

  // Load Pascal geometry into scene store when available
  useEffect(() => {
    if (model?.pascalData) {
      try {
        loadScene(JSON.parse(model.pascalData));
      } catch (e) {
        console.error('Failed to parse pascal data:', e);
      }
    }
  }, [model?.pascalData, loadScene]);

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

  // Delete selected items
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        const ids = useViewer.getState().selectedIds;
        if (ids.length === 0) return;
        const { deleteNode } = useScene.getState();
        ids.forEach(id => deleteNode(id));
        useViewer.getState().clearSelection();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const leftPanelContent = (
    <div className="space-y-8">
      {/* Node Graph Toolchain */}
      <div>
        <div className="flex items-center gap-2 mb-4 px-1">
          <div className="w-1.5 h-4 bg-primary rounded-full"></div>
          <h2 className="text-sm font-semibold tracking-wide uppercase text-white/90">Generation Node Graph</h2>
        </div>
        
        <div className="space-y-3 relative before:absolute before:inset-y-6 before:left-[19px] before:w-px before:bg-white/10 before:z-0 z-10">
          {/* Pascal Geometric Tool */}
          <button
            onClick={() => setActiveTool('pascal')}
            className={`w-full flex items-center p-3 rounded-2xl border transition-all duration-300 relative z-10 group overflow-hidden ${activeTool === 'pascal' 
                ? 'bg-gradient-to-br from-indigo-500/20 to-indigo-900/10 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/20' 
                : 'bg-[#111] border-white/5 hover:bg-[#151515] hover:border-white/10'}`}
          >
            {activeTool === 'pascal' && <div className="absolute inset-0 bg-indigo-500/10 blur-xl opacity-50"></div>}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${activeTool === 'pascal' ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'bg-white/5 text-muted-foreground group-hover:bg-white/10 group-hover:text-white'}`}>
              <Layers className="w-5 h-5" />
            </div>
            <div className="ml-4 text-left flex-1 relative z-10">
              <div className={`font-medium text-sm transition-colors ${activeTool === 'pascal' ? 'text-indigo-100' : 'text-foreground'}`}>Pascal Geometric</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">3D Architecture Node Builder</div>
            </div>
          </button>

          {/* Isometric Tool */}
          <button
            onClick={() => setActiveTool('isometric')}
            className={`w-full flex items-center p-3 rounded-2xl border transition-all duration-300 relative z-10 group overflow-hidden ${activeTool === 'isometric' 
                ? 'bg-gradient-to-br from-primary/20 to-primary/5 border-primary/50 shadow-[0_0_20px_rgba(249,115,22,0.15)] ring-1 ring-primary/20' 
                : 'bg-[#111] border-white/5 hover:bg-[#151515] hover:border-white/10'}`}
          >
            {activeTool === 'isometric' && <div className="absolute inset-0 bg-primary/10 blur-xl opacity-50"></div>}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${hasIsometric ? 'bg-green-500/20 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]' : activeTool === 'isometric' ? 'bg-primary text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'bg-white/5 text-muted-foreground group-hover:bg-white/10 group-hover:text-white'}`}>
              {hasIsometric ? <Check className="w-5 h-5" /> : <RotateCw className="w-5 h-5" />}
            </div>
            <div className="ml-4 text-left flex-1 relative z-10">
              <div className={`font-medium text-sm transition-colors ${activeTool === 'isometric' ? 'text-orange-100' : 'text-foreground'}`}>Isometric Render</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">2.5D Concept Generation</div>
            </div>
          </button>

          {/* 3D Model Tool */}
          <button
            onClick={() => setActiveTool('3d')}
            className={`w-full flex items-center p-3 rounded-2xl border transition-all duration-300 relative z-10 group overflow-hidden ${activeTool === '3d' 
                ? 'bg-gradient-to-br from-blue-500/20 to-blue-900/10 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/20' 
                : 'bg-[#111] border-white/5 hover:bg-[#151515] hover:border-white/10'}`}
          >
            {activeTool === '3d' && <div className="absolute inset-0 bg-blue-500/10 blur-xl opacity-50"></div>}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${has3D ? 'bg-green-500/20 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]' : activeTool === '3d' ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'bg-white/5 text-muted-foreground group-hover:bg-white/10 group-hover:text-white'}`}>
              {has3D ? <Check className="w-5 h-5" /> : <Box className="w-5 h-5" />}
            </div>
            <div className="ml-4 text-left flex-1 relative z-10">
              <div className={`font-medium text-sm transition-colors ${activeTool === '3d' ? 'text-blue-100' : 'text-foreground'}`}>3D Extrusion Engine</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Volumetric Mesh Builder</div>
            </div>
          </button>

          {/* Texture Tool */}
          <button
            onClick={() => setActiveTool('texture')}
            className={`w-full flex items-center p-3 rounded-2xl border transition-all duration-300 relative z-10 group overflow-hidden ${activeTool === 'texture' 
                ? 'bg-gradient-to-br from-purple-500/20 to-purple-900/10 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/20' 
                : 'bg-[#111] border-white/5 hover:bg-[#151515] hover:border-white/10'}`}
          >
            {activeTool === 'texture' && <div className="absolute inset-0 bg-purple-500/10 blur-xl opacity-50"></div>}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${activeTool === 'texture' ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-white/5 text-muted-foreground group-hover:bg-white/10 group-hover:text-white'}`}>
              <Paintbrush className="w-5 h-5" />
            </div>
            <div className="ml-4 text-left flex-1 relative z-10">
              <div className={`font-medium text-sm transition-colors ${activeTool === 'texture' ? 'text-purple-100' : 'text-foreground'}`}>Material Painting</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">AI Texture Application</div>
            </div>
          </button>
        </div>
      </div>

      <div className="pt-6 border-t border-white/[0.04]">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">Canvas Viewer Modes</div>
        <div className="space-y-1.5 bg-black/20 p-2 rounded-2xl border border-white/5">
          {['original', 'isometric', '3d', 'split'].map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode as ViewMode)}
              disabled={(mode === 'isometric' && !hasIsometric) || (mode === '3d' && !has3D && !hasPascal)}
              className={`w-full flex items-center px-4 py-3 rounded-xl text-sm transition-all duration-200 ${viewMode === mode
                ? 'bg-white/10 text-white font-medium shadow-md border border-white/5'
                : 'text-muted-foreground hover:text-white hover:bg-white/[0.03] border border-transparent'
                } disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              <div className={`w-2 h-2 rounded-full mr-3 shrink-0 ${viewMode === mode ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-white/20'}`}></div>
              {mode.charAt(0).toUpperCase() + mode.slice(1)} View
            </button>
          ))}
        </div>
      </div>

      {/* Scene Controls - visibility, camera presets, exploded view */}
      {viewMode === '3d' && hasPascal && (
        <div className="pt-6 border-t border-white/[0.04]">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">Scene Controls</div>

          {/* Visibility Toggles */}
          <div className="grid grid-cols-2 gap-1.5 mb-4">
            {([
              ['showWalls', 'Walls'],
              ['showSlabs', 'Floors'],
              ['showRoofs', 'Roofs'],
              ['showItems', 'Items'],
              ['showZones', 'Zones'],
              ['showGrid', 'Grid'],
            ] as const).map(([key, label]) => (
              <VisibilityToggle key={key} storeKey={key} label={label} />
            ))}
          </div>

          {/* Camera Presets */}
          <div className="text-[10px] text-muted-foreground mb-2 px-1">Camera</div>
          <div className="flex gap-1 mb-4">
            {([
              ['top', ArrowUp, 'Top'],
              ['front', Eye, 'Front'],
              ['right', ArrowRight, 'Side'],
              ['perspective', Box, '3D'],
              ['isometric', Grid3x3, 'Iso'],
            ] as const).map(([preset, Icon, label]) => (
              <CameraPresetButton key={preset} preset={preset} Icon={Icon} label={label} />
            ))}
          </div>

          {/* Exploded View */}
          <div className="text-[10px] text-muted-foreground mb-2 px-1">Exploded View</div>
          <ExplodedViewControl />

          {/* Furniture Catalog */}
          <div className="mt-4">
            <div className="text-[10px] text-muted-foreground mb-2 px-1">Add Furniture</div>
            <FurnitureCatalogPanel />
          </div>
        </div>
      )}
    </div>
  );

  const rightPanelContent = (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex-1">
        <AnimatePresence mode="wait">
          {activeTool === 'pascal' && (
            <motion.div
              key="pascal"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                  <Layers className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="text-sm font-semibold text-white/90 mb-1">Pascal Geometric Generation</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">Algorithmically converts 2D raster floorplans into structured, editable 3D node graphs (walls, doors, windows).</p>
              </div>

              <div className="space-y-5">
                <Button
                  onClick={() => generatePascalMutation.mutate(model.id)}
                  disabled={generatePascalMutation.isPending}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 rounded-xl h-11 text-white font-medium shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all hover:shadow-[0_0_25px_rgba(79,70,229,0.6)]"
                >
                  {generatePascalMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Building Geometry...</>
                  ) : (
                    <><Layers className="w-4 h-4 mr-2" />Run Geometric Pipeline</>
                  )}
                </Button>
                
                <div className="p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                    <span className="text-xs font-medium text-indigo-200">How it works</span>
                  </div>
                  <ul className="text-[11px] text-muted-foreground space-y-1.5 pl-4 list-disc marker:text-indigo-500/50">
                    <li>Analyzes floorplan topology</li>
                    <li>Extracts vectorial wall definitions</li>
                    <li>Generates watertight 3D nodes</li>
                    <li>Exports to Pascal Editor</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}

          {activeTool === 'isometric' && (
            <motion.div
              key="isometric"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <RotateCw className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-white/90 mb-1">Generate Isometric</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">Transform your 2D floorplan layout into a stunning 3D isometric perspective view.</p>
              </div>

              <div className="space-y-5">
                <div>
                  <Label htmlFor="prompt" className="text-xs font-medium text-muted-foreground mb-2 block">Style Overrides</Label>
                  <Textarea
                    id="prompt"
                    placeholder="E.g. modern minimalist style with warm lighting, wood floors..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className="text-sm bg-black/40 border-white/10 resize-none focus-visible:ring-primary/50 rounded-xl shadow-inner placeholder:text-muted-foreground/50"
                    rows={4}
                    disabled={isGenerating}
                  />
                </div>
                <Button
                  onClick={() => generateIsometricMutation.mutate({ modelId: model.id, prompt: customPrompt || undefined })}
                  disabled={isGenerating || generateIsometricMutation.isPending}
                  className="w-full bg-primary hover:bg-primary/90 rounded-xl h-11 text-primary-foreground font-medium shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all hover:shadow-[0_0_25px_rgba(249,115,22,0.5)]"
                >
                  {generateIsometricMutation.isPending || model.status === 'generating_isometric' ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
                  ) : hasIsometric ? (
                    <><RotateCw className="w-4 h-4 mr-2" />Regenerate Pipeline</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" />Run Pipeline</>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {activeTool === '3d' && (
            <motion.div
              key="3d"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
                  <Box className="w-5 h-5 text-blue-500" />
                </div>
                <h3 className="text-sm font-semibold text-white/90 mb-1">Create 3D Model</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">Extrude your isometric view into a fully navigable 3D mesh model.</p>
              </div>

              <div className="space-y-5">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-2 block">3D Compute Engine</Label>
                  <div className="grid gap-2">
                    <button
                      onClick={() => setProvider3D('trellis')}
                      disabled={isGenerating || generate3DMutation.isPending}
                      className={`text-left p-3 rounded-xl border transition-all duration-200 flex items-center justify-between group ${provider3D === 'trellis'
                        ? 'bg-blue-500/10 border-blue-500/50 text-foreground ring-1 ring-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                        : 'bg-black/20 border-white/10 text-muted-foreground hover:bg-white/[0.04]'
                        }`}
                    >
                      <div>
                        <div className="font-medium text-sm text-balance">TRELLIS Engine</div>
                        <div className="text-[10px] opacity-70 mt-0.5">Open Source • Faster (1m)</div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${provider3D === 'trellis' ? 'border-blue-500 bg-blue-500 text-white' : 'border-white/20'}`}>
                        {provider3D === 'trellis' && <Check className="w-3 h-3" />}
                      </div>
                    </button>
                    <button
                      onClick={() => setProvider3D('meshy')}
                      disabled={isGenerating || generate3DMutation.isPending}
                      className={`text-left p-3 rounded-xl border transition-all duration-200 flex items-center justify-between group ${provider3D === 'meshy'
                        ? 'bg-blue-500/10 border-blue-500/50 text-foreground ring-1 ring-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                        : 'bg-black/20 border-white/10 text-muted-foreground hover:bg-white/[0.04]'
                        }`}
                    >
                      <div>
                        <div className="font-medium text-sm text-balance">Meshy AI Engine</div>
                        <div className="text-[10px] opacity-70 mt-0.5">Commercial • High Detail (4m)</div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${provider3D === 'meshy' ? 'border-blue-500 bg-blue-500 text-white' : 'border-white/20'}`}>
                        {provider3D === 'meshy' && <Check className="w-3 h-3" />}
                      </div>
                    </button>
                  </div>
                </div>

                <Button
                  onClick={() => generate3DMutation.mutate(model.id)}
                  disabled={isGenerating || generate3DMutation.isPending}
                  className="w-full rounded-xl h-11 text-white shadow-lg transition-all"
                  style={{ backgroundColor: '#2563eb' }}
                  variant="default"
                >
                  {generate3DMutation.isPending || is3DGenerationStatus(model.status) ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running Compute...</>
                  ) : has3D ? (
                    <><RotateCw className="w-4 h-4 mr-2" />Re-run Compute Engine</>
                  ) : (
                    <><Box className="w-4 h-4 mr-2" />Run Compute Engine</>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {activeTool === 'texture' && (
            <motion.div
              key="texture"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-6">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center mb-3">
                  <Paintbrush className="w-5 h-5 text-orange-500" />
                </div>
                <h3 className="text-sm font-semibold text-white/90 mb-1">Material Overrides</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">Repaint surfaces and apply new contextual materials to your 3D mesh.</p>
              </div>

              <div className="space-y-5">
                <div>
                  <Label htmlFor="texture-prompt" className="text-xs font-medium text-muted-foreground mb-2 block">Describe Materials</Label>
                  <Textarea
                    id="texture-prompt"
                    placeholder="E.g. dark oak floors, marble countertops, matte black appliances..."
                    value={texturePrompt}
                    onChange={(e) => setTexturePrompt(e.target.value)}
                    className="text-sm bg-black/40 border-white/10 resize-none focus-visible:ring-primary/50 rounded-xl shadow-inner placeholder:text-muted-foreground/50"
                    rows={4}
                    disabled={!has3D || isGenerating || retextureMutation.isPending}
                  />
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={() => retextureMutation.mutate({ modelId: model.id, prompt: texturePrompt })}
                    disabled={!has3D || !texturePrompt.trim() || isGenerating || retextureMutation.isPending}
                    className="w-full rounded-xl h-11 shadow-lg"
                    style={{ backgroundColor: has3D && texturePrompt.trim() ? '#f97316' : undefined, color: '#fff' }}
                    variant={has3D && texturePrompt.trim() ? "default" : "secondary"}
                  >
                    {retextureMutation.isPending || model.status === 'retexturing' ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Painting Textures...</>
                    ) : (
                      <><Paintbrush className="w-4 h-4 mr-2" />Apply Material overrides</>
                    )}
                  </Button>

                  {model.baseModel3dUrl && model.baseModel3dUrl !== model.model3dUrl && (
                    <Button
                      onClick={() => revertMutation.mutate(model.id)}
                      disabled={isGenerating || revertMutation.isPending}
                      className="w-full rounded-xl h-10 bg-white/5 hover:bg-white/10 border-white/10"
                      variant="outline"
                      size="sm"
                    >
                      <><Undo2 className="w-4 h-4 mr-2" />Revert to Base Materials</>
                    </Button>
                  )}
                </div>
                {!has3D && (
                  <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                    <p className="text-[11px] text-center text-orange-400 font-medium tracking-wide">
                      Missing dependency! You must run the 3D Engine pipeline first.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Export Section at the bottom of right panel */}
      {(hasIsometric || has3D) && (
        <div className="pt-5 border-t border-white/[0.04] mt-auto">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="rounded-xl h-10 bg-black/20 border-white/10 hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors">
              <Share2 className="w-4 h-4 mr-2 opacity-70" /> Share
            </Button>
            <Button size="sm" className="bg-white text-black hover:bg-white/90 shadow-lg rounded-xl h-10 font-medium transition-colors">
              <Download className="w-4 h-4 mr-2 opacity-70" /> Export
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Layout>
      <PageTransition>
        <WorkspaceLayout
          title={project.name}
          backHref="/projects"
          leftPanel={leftPanelContent}
          rightPanel={rightPanelContent}
        >
          {/* Center Canvas */}
          <div className="w-full h-full flex flex-col relative bg-black/40 rounded-2xl border border-white/[0.04] shadow-2xl overflow-hidden backdrop-blur-3xl">
            {/* Toolbar in Canvas */}
            <div className="absolute top-4 left-4 z-20 flex gap-2">
              <div className="bg-black/60 backdrop-blur-md rounded-lg border border-white/10 px-3 py-1.5 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[10px] text-white/70 uppercase tracking-widest font-medium">Node Viewer Live</span>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {viewMode === 'original' && (
                <motion.div
                  key="original"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full flex items-center justify-center relative z-10"
                >
                  <TransformWrapper centerOnInit minScale={0.5} maxScale={4}>
                    <ViewZoomControls />
                    <TransformComponent wrapperClass="w-full h-full" contentClass="w-full h-full flex items-center justify-center p-8 lg:p-12">
                      <img
                        src={model.originalUrl}
                        alt="Original Floorplan"
                        className="max-w-full max-h-full object-contain rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10 cursor-grab active:cursor-grabbing"
                        data-testid="img-original"
                      />
                    </TransformComponent>
                  </TransformWrapper>
                </motion.div>
              )}

              {viewMode === 'isometric' && hasIsometric && (
                <motion.div
                  key="isometric"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full flex items-center justify-center relative z-10"
                >
                  <TransformWrapper centerOnInit minScale={0.5} maxScale={4}>
                    <ViewZoomControls />
                    <TransformComponent wrapperClass="w-full h-full" contentClass="w-full h-full flex items-center justify-center p-8 lg:p-12">
                      <img
                        src={model.isometricUrl!}
                        alt="Isometric View"
                        className="max-w-full max-h-full object-contain rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10 cursor-grab active:cursor-grabbing"
                        data-testid="img-isometric"
                      />
                    </TransformComponent>
                  </TransformWrapper>
                </motion.div>
              )}

              {viewMode === '3d' && (
                <motion.div
                  key="3d"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full z-10 relative"
                >
                  {hasPascal ? (
                    <FloorplanCanvas />
                  ) : has3D ? (
                    <Model3DViewer modelUrl={model.model3dUrl!} isometricUrl={model.isometricUrl || undefined} />
                  ) : (
                    <Model3DPlaceholder />
                  )}
                </motion.div>
              )}

              {viewMode === 'split' && (
                <motion.div
                  key="split"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full flex z-10 relative"
                >
                  <div className="w-1/2 h-full border-r border-white/10 p-4 bg-white/[0.02] flex flex-col relative z-10">
                    <div className="text-[10px] text-white/50 bg-black/40 self-start px-2 py-1 rounded backdrop-blur-md mb-2 uppercase tracking-widest font-medium border border-white/5">Input Node</div>
                    <div className="flex-1 flex items-center justify-center overflow-hidden">
                      <img src={model.originalUrl} alt="Original" className="max-w-full max-h-full object-contain filter drop-shadow-2xl" />
                    </div>
                  </div>
                  <div className="w-1/2 h-full p-4 flex flex-col relative z-10 bg-black/20">
                    <div className="text-[10px] text-white/50 bg-black/40 self-start xl:-ml-4 px-2 py-1 rounded backdrop-blur-md mb-2 uppercase tracking-widest font-medium border border-white/5 relative z-20">Output Node ({hasIsometric ? 'Isometric' : 'Pending'})</div>
                    <div className="flex-1 flex items-center justify-center overflow-hidden">
                      {hasIsometric ? (
                        <img src={model.isometricUrl!} alt="Isometric" className="max-w-full max-h-full object-contain filter drop-shadow-2xl" />
                      ) : (
                        <div className="text-muted-foreground text-center">
                          <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-30" />
                          <p className="text-xs uppercase tracking-widest opacity-50">Generate isometric view first</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Central Loading Overlay */}
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 bg-[#050505]/80 flex flex-col items-center justify-center backdrop-blur-3xl z-50 p-6"
              >
                <div className="w-full max-w-md bg-[#111]/80 backdrop-blur-xl border border-white/[0.08] shadow-[0_30px_60px_rgba(0,0,0,0.8)] rounded-3xl p-8 relative overflow-hidden">
                  {/* Decorative glowing orb */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/20 rounded-full blur-[60px] pointer-events-none"></div>
                  
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-20 h-20 mb-6 bg-gradient-to-br from-white/10 to-transparent rounded-2xl border border-white/10 flex items-center justify-center shadow-inner relative overflow-hidden">
                       <motion.div 
                         initial={{ rotate: 0 }} 
                         animate={{ rotate: 360 }} 
                         transition={{ duration: 3, ease: "linear", repeat: Infinity }}
                         className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-b from-transparent to-primary/40"
                       />
                       <Loader2 className="w-8 h-8 text-white relative z-10 animate-spin" />
                    </div>
                    
                    <h2 className="text-xl font-semibold tracking-tight text-white mb-2">
                      {model.status === 'generating_pascal' ? 'Building Semantic Geometry...' :
                       model.status === 'generating_isometric' ? 'Rendering Isometric Scene...' :
                       model.status === 'generating_3d_trellis' ? 'Synthesizing TRELLIS Mesh...' :
                       model.status === 'generating_3d_meshy' ? 'Synthesizing Meshy Geometry...' :
                       model.status === 'retexturing' ? 'Applying Material Networks...' : 
                       'Synthesizing Volumetric Mesh...'}
                    </h2>
                    
                    <p className="text-sm text-muted-foreground text-center mb-6 max-w-[280px]">
                      {model.status === 'generating_pascal' ? 'Extracting architectural primitives and structural graphs.' :
                       model.status === 'generating_isometric' ? 'Diffusing styled light and materials in 2.5D space.' :
                       model.status === 'generating_3d_trellis' ? 'Running the TRELLIS volumetric reconstruction stack and validating the returned GLB contract.' :
                       model.status === 'generating_3d_meshy' ? 'Queueing Meshy image-to-3D generation with realistic PBR output settings.' :
                       model.status === 'retexturing' ? 'Projecting and baking complex textures onto structural meshes.' : 
                       'Extruding structures and generating point clouds...'}
                    </p>

                    <div className="w-full space-y-2">
                       <div className="flex justify-between text-[11px] font-medium tracking-wider uppercase text-white/50">
                         <span>Compute Progress</span>
                         <span className="text-primary font-mono">{Math.round(progress)}%</span>
                       </div>
                       <Progress value={progress} className="h-1.5 bg-white/5" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </WorkspaceLayout>
      </PageTransition>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => {
          setShowPaywall(false);
          invalidateSubscription();
        }}
        trigger="limit_reached"
      />
    </Layout>
  );
}
