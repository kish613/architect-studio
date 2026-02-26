import { useParams, Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Share2, Loader2, Sparkles, Box, RotateCw, Check, Paintbrush, Undo2, ZoomIn, ZoomOut, Expand } from "lucide-react";
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchProject, generateIsometric, generate3D, generate3DTrellis, checkModelStatus, retextureModel, checkRetextureStatus, revertTexture } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Model3DViewer, Model3DPlaceholder } from "@/components/viewer/Model3DViewer";
import { PaywallModal } from "@/components/subscription";
import { useSubscription } from "@/hooks/use-subscription";
import { PageTransition } from "@/components/ui/page-transition";

type ViewMode = 'original' | 'isometric' | '3d' | 'split';
type Provider3D = 'meshy' | 'trellis';
type ToolMode = 'isometric' | '3d' | 'texture';

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
  const [activeTool, setActiveTool] = useState<ToolMode>('isometric');
  const [customPrompt, setCustomPrompt] = useState("");
  const [texturePrompt, setTexturePrompt] = useState("");
  const [showPaywall, setShowPaywall] = useState(false);
  const [provider3D, setProvider3D] = useState<Provider3D>('trellis');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { subscription, invalidate: invalidateSubscription } = useSubscription();

  const { data: project, isLoading, refetch } = useQuery({
    queryKey: ['project', id],
    queryFn: () => fetchProject(parseInt(id || '0')),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      const model = data?.models[0];
      if (model?.status === 'generating_isometric' || model?.status === 'generating_3d' || model?.status === 'retexturing') {
        return 3000;
      }
      return false;
    },
  });

  const generateIsometricMutation = useMutation({
    mutationFn: async ({ modelId, prompt }: { modelId: number; prompt?: string }) => {
      if (!subscription?.canGenerate) {
        throw new Error("INSUFFICIENT_CREDITS");
      }
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
      if (error.message === "INSUFFICIENT_CREDITS" || error.message.includes("limit")) {
        setShowPaywall(true);
        return;
      }
      if (error.message.includes("403") || error.message.includes("Credit limit")) {
        setShowPaywall(true);
        invalidateSubscription();
        return;
      }
      toast({ title: "Generation failed", description: error.message, variant: "destructive" });
    },
  });

  const generate3DMutation = useMutation({
    mutationFn: (modelId: number) =>
      provider3D === 'trellis' ? generate3DTrellis(modelId) : generate3D(modelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      if (provider3D === 'trellis') {
        toast({ title: "3D model ready!", description: "TRELLIS model generated successfully." });
        setViewMode('3d');
        setActiveTool('texture');
      } else {
        toast({ title: "3D generation started!", description: "This may take a few minutes." });
      }
    },
    onError: (error: Error) => {
      toast({ title: "3D generation failed", description: error.message, variant: "destructive" });
    },
  });

  const retextureMutation = useMutation({
    mutationFn: ({ modelId, prompt }: { modelId: number; prompt: string }) =>
      retextureModel(modelId, prompt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      toast({ title: "Retexturing started!", description: "AI is enhancing textures..." });
    },
    onError: (error: Error) => {
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

    if (model?.status === 'generating_3d' && model.meshyTaskId) {
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

  const model = project.models[0];

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

  const isGenerating = model.status === 'generating_isometric' || model.status === 'generating_3d' || model.status === 'retexturing';
  const hasIsometric = !!model.isometricUrl;
  const has3D = !!model.model3dUrl;

  const leftPanelContent = (
    <div className="space-y-6">
      <div>
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">Toolbox</div>
        <div className="grid grid-cols-2 gap-2">
          {/* Isometric Tool */}
          <button
            onClick={() => setActiveTool('isometric')}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-300 weavy-node ${activeTool === 'isometric' ? 'active' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${hasIsometric ? 'bg-green-500/10 text-green-500 shadow-[0_0_12px_rgba(34,197,94,0.3)]' : 'bg-primary/10 text-primary'}`}>
              {hasIsometric ? <Check className="w-4 h-4" /> : <RotateCw className="w-4 h-4" />}
            </div>
            <span className="text-xs font-medium text-center">Isometric</span>
          </button>

          {/* 3D Model Tool */}
          <button
            onClick={() => setActiveTool('3d')}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-300 weavy-node ${activeTool === '3d' ? 'active' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${has3D ? 'bg-green-500/10 text-green-500 shadow-[0_0_12px_rgba(34,197,94,0.3)]' : 'bg-blue-500/10 text-blue-500'}`}>
              {has3D ? <Check className="w-4 h-4" /> : <Box className="w-4 h-4" />}
            </div>
            <span className="text-xs font-medium text-center">3D Model</span>
          </button>

          {/* Texture Tool */}
          <button
            onClick={() => setActiveTool('texture')}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-300 weavy-node col-span-2 ${activeTool === 'texture' ? 'active' : ''}`}
          >
            <div className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center mb-2">
              <Paintbrush className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-center">Material Textures</span>
          </button>
        </div>
      </div>

      <div className="pt-4 border-t border-white/[0.04]">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">Canvas Viewer</div>
        <div className="space-y-1">
          {['original', 'isometric', '3d', 'split'].map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode as ViewMode)}
              disabled={(mode === 'isometric' && !hasIsometric) || (mode === '3d' && !has3D)}
              className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm transition-all ${viewMode === mode
                ? 'bg-white/10 text-foreground font-medium shadow-inner'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
                } disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              <span className="w-2 h-2 rounded-full mr-3 inline-block bg-current object-cover flex-shrink-0" style={{ opacity: viewMode === mode ? 1 : 0.3 }}></span>
              {mode.charAt(0).toUpperCase() + mode.slice(1)} View
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const rightPanelContent = (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex-1">
        <AnimatePresence mode="wait">
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
                  disabled={!hasIsometric || isGenerating || generate3DMutation.isPending}
                  className="w-full rounded-xl h-11 text-white shadow-lg transition-all"
                  style={{ backgroundColor: hasIsometric ? '#3b82f6' : undefined }}
                  variant={hasIsometric ? "default" : "secondary"}
                >
                  {generate3DMutation.isPending || model.status === 'generating_3d' ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running Compute...</>
                  ) : has3D ? (
                    <><RotateCw className="w-4 h-4 mr-2" />Re-run Compute Engine</>
                  ) : (
                    <><Box className="w-4 h-4 mr-2" />Run Compute Engine</>
                  )}
                </Button>
                {!hasIsometric && (
                  <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                    <p className="text-[11px] text-center text-orange-400 font-medium tracking-wide">
                      Missing dependency! You must run the Isometric Generation pipeline first.
                    </p>
                  </div>
                )}
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
                  {has3D ? (
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
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-xl z-50"
              >
                <div className="text-center bg-[#111] border border-white/[0.06] rounded-2xl p-8 max-w-sm shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                  <div className="relative w-16 h-16 mx-auto mb-6">
                    <div className="absolute inset-0 rounded-full border border-white/10" />
                    <div className="absolute inset-0 rounded-full border border-transparent border-t-primary animate-spin" />
                    <Loader2 className="w-8 h-8 absolute inset-0 m-auto text-primary animate-spin" />
                  </div>
                  <p className="text-lg font-medium tracking-tight mb-2">
                    {model.status === 'generating_isometric' ? 'Running Isometric Pipeline...' :
                      model.status === 'retexturing' ? 'Applying Material Overlays...' : 'Compiling 3D Mesh...'}
                  </p>
                  <p className="text-sm text-muted-foreground">This computation may take a few moments directly on the server nodes.</p>
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
