import { useParams, Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Share2, Loader2, Sparkles, Box, RotateCw, Check, Paintbrush, Undo2 } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchProject, generateIsometric, generate3D, generate3DTrellis, checkModelStatus, retextureModel, checkRetextureStatus, revertTexture } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Model3DViewer, Model3DPlaceholder } from "@/components/viewer/Model3DViewer";
import { PaywallModal } from "@/components/subscription";
import { useSubscription } from "@/hooks/use-subscription";
import { PageTransition } from "@/components/ui/page-transition";

type ViewMode = 'original' | 'isometric' | '3d' | 'split';
type Provider3D = 'meshy' | 'trellis';

export function Viewer() {
  const { id } = useParams();
  const [viewMode, setViewMode] = useState<ViewMode>('original');
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
      // Pre-check: Verify credits available before making request
      if (!subscription?.canGenerate) {
        throw new Error("INSUFFICIENT_CREDITS");
      }
      return generateIsometric(modelId, prompt);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      invalidateSubscription(); // Refresh subscription to update credit count
      toast({ title: "Isometric view generated!", description: "Your floorplan has been transformed." });
      setViewMode('isometric');
    },
    onError: (error: Error) => {
      // Check if error is credit-related
      if (error.message === "INSUFFICIENT_CREDITS" || error.message.includes("limit")) {
        setShowPaywall(true);
        return;
      }

      // Check for API 403 response (credit limit hit during generation)
      if (error.message.includes("403") || error.message.includes("Credit limit")) {
        setShowPaywall(true);
        invalidateSubscription(); // Refresh to show accurate credit count
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
    // Handle retexturing status polling
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
    
    // Handle regular 3D generation status polling
    if (model?.status === 'generating_3d' && model.meshyTaskId) {
      const interval = setInterval(async () => {
        const updated = await checkModelStatus(model.id);
        if (updated.status === 'completed' || updated.status === 'failed') {
          clearInterval(interval);
          refetch();
          if (updated.status === 'completed') {
            toast({ title: "3D model ready!", description: "Your model is complete." });
            setViewMode('3d');
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

  const getStatusBadge = () => {
    switch (model.status) {
      case 'uploaded':
        return <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400">Ready for AI</span>;
      case 'generating_isometric':
        return <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 animate-pulse">Generating Isometric...</span>;
      case 'isometric_ready':
        return <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">Isometric Ready</span>;
      case 'generating_3d':
        return <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 animate-pulse">Creating 3D Model...</span>;
      case 'retexturing':
        return <span className="text-xs px-2 py-1 rounded-full bg-orange-500/20 text-orange-400 animate-pulse">Retexturing...</span>;
      case 'completed':
        return <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">Complete</span>;
      case 'failed':
        return <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400">Failed</span>;
      default:
        return null;
    }
  };

  return (
    <Layout>
      <PageTransition>
      <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-96px)] overflow-hidden">
        {/* Left Panel - Controls */}
        <div className="w-full lg:w-80 shrink-0 max-h-[40vh] lg:max-h-none border-b lg:border-b-0 lg:border-r border-white/[0.06] bg-card/30 dark-dot-grid p-4 lg:p-6 overflow-y-auto relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/40 to-transparent" />
          <motion.div
            className="flex items-center gap-4 mb-6"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <Link href="/projects">
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 transition-colors duration-200" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-display font-semibold text-lg" data-testid="text-project-name">{project.name}</h1>
              {getStatusBadge()}
            </div>
          </motion.div>

          {/* Step 1: Generate Isometric */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          >
          <Card className="mb-4 dark-glass-card rounded-2xl border-white/[0.06] hover:border-primary/20 transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${hasIsometric ? 'bg-green-500 shadow-sm shadow-green-500/30' : 'bg-primary ring-2 ring-primary/30'}`}>
                  {hasIsometric ? <Check className="w-4 h-4" /> : '1'}
                </div>
                <h3 className="font-medium">Generate Isometric View</h3>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="prompt" className="text-xs text-muted-foreground">Style Prompt (optional)</Label>
                  <Textarea
                    id="prompt"
                    placeholder="Modern minimalist style with warm lighting..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className="mt-1 text-sm bg-background/50 resize-none"
                    rows={3}
                    disabled={isGenerating}
                  />
                </div>
                <Button
                  onClick={() => generateIsometricMutation.mutate({ modelId: model.id, prompt: customPrompt || undefined })}
                  disabled={isGenerating || generateIsometricMutation.isPending}
                  className="w-full bg-primary hover:bg-primary/90"
                  size="sm"
                  data-testid="button-generate-isometric"
                >
                  {generateIsometricMutation.isPending || model.status === 'generating_isometric' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : hasIsometric ? (
                    <>
                      <RotateCw className="w-4 h-4 mr-2" />
                      Regenerate
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate with AI
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
          </motion.div>

          {/* Step 2: Generate 3D */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
          >
          <Card className={`mb-4 dark-glass-card rounded-2xl border-white/[0.06] hover:border-primary/20 transition-all duration-300 ${!hasIsometric ? 'opacity-50' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${has3D ? 'bg-green-500 shadow-sm shadow-green-500/30' : hasIsometric ? 'bg-primary ring-2 ring-primary/30' : 'bg-muted'}`}>
                  {has3D ? <Check className="w-4 h-4" /> : '2'}
                </div>
                <h3 className="font-medium">Create 3D Model</h3>
              </div>

              {/* Provider Toggle */}
              <div className="mb-3">
                <Label className="text-xs text-muted-foreground mb-1.5 block">3D Engine</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setProvider3D('trellis')}
                    disabled={isGenerating || generate3DMutation.isPending}
                    className={`text-xs px-2 py-1.5 rounded-md border transition-colors ${
                      provider3D === 'trellis'
                        ? 'bg-primary/20 border-primary text-primary font-medium'
                        : 'bg-background/50 border-border/50 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    TRELLIS
                    <span className="block text-[10px] opacity-70">Open Source</span>
                  </button>
                  <button
                    onClick={() => setProvider3D('meshy')}
                    disabled={isGenerating || generate3DMutation.isPending}
                    className={`text-xs px-2 py-1.5 rounded-md border transition-colors ${
                      provider3D === 'meshy'
                        ? 'bg-primary/20 border-primary text-primary font-medium'
                        : 'bg-background/50 border-border/50 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Meshy AI
                    <span className="block text-[10px] opacity-70">Commercial</span>
                  </button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mb-3">
                {provider3D === 'trellis'
                  ? 'Generate with Microsoft TRELLIS (open source). Takes 1-2 minutes.'
                  : 'Generate with Meshy AI (commercial). Takes 3-5 minutes.'}
              </p>

              <Button
                onClick={() => generate3DMutation.mutate(model.id)}
                disabled={!hasIsometric || isGenerating || generate3DMutation.isPending}
                className="w-full"
                variant={hasIsometric ? "default" : "secondary"}
                size="sm"
                data-testid="button-generate-3d"
              >
                {generate3DMutation.isPending || model.status === 'generating_3d' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {provider3D === 'trellis' ? 'Generating with TRELLIS...' : 'Creating 3D Model...'}
                  </>
                ) : has3D ? (
                  <>
                    <RotateCw className="w-4 h-4 mr-2" />
                    Regenerate 3D
                  </>
                ) : (
                  <>
                    <Box className="w-4 h-4 mr-2" />
                    Generate 3D Model
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
          </motion.div>

          {/* Step 3: Retexture (optional) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
          >
          <Card className={`mb-4 dark-glass-card rounded-2xl border-white/[0.06] hover:border-primary/20 transition-all duration-300 ${!has3D ? 'opacity-50' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${has3D ? 'bg-primary ring-2 ring-primary/30' : 'bg-muted'}`}>
                  3
                </div>
                <h3 className="font-medium">Enhance Textures</h3>
                <span className="text-xs text-muted-foreground">(Optional)</span>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="texture-prompt" className="text-xs text-muted-foreground">Describe new texture style</Label>
                  <Textarea
                    id="texture-prompt"
                    placeholder="Weathered wood, rustic brick walls, marble floors..."
                    value={texturePrompt}
                    onChange={(e) => setTexturePrompt(e.target.value)}
                    className="mt-1 text-sm bg-background/50 resize-none"
                    rows={2}
                    disabled={!has3D || isGenerating || retextureMutation.isPending}
                  />
                </div>
                <Button
                  onClick={() => retextureMutation.mutate({ modelId: model.id, prompt: texturePrompt })}
                  disabled={!has3D || !texturePrompt.trim() || isGenerating || retextureMutation.isPending}
                  className="w-full"
                  variant="outline"
                  size="sm"
                  data-testid="button-retexture"
                >
                  {retextureMutation.isPending || model.status === 'retexturing' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Retexturing...
                    </>
                  ) : (
                    <>
                      <Paintbrush className="w-4 h-4 mr-2" />
                      Apply New Textures
                    </>
                  )}
                </Button>
                
                {/* Revert button - only show if we have a base model to revert to */}
                {model.baseModel3dUrl && model.baseModel3dUrl !== model.model3dUrl && (
                  <Button
                    onClick={() => revertMutation.mutate(model.id)}
                    disabled={isGenerating || revertMutation.isPending}
                    className="w-full"
                    variant="ghost"
                    size="sm"
                    data-testid="button-revert-texture"
                  >
                    {revertMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Reverting...
                      </>
                    ) : (
                      <>
                        <Undo2 className="w-4 h-4 mr-2" />
                        Revert to Original
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          </motion.div>

          {/* View Mode Selector */}
          <motion.div
            className="space-y-2 mt-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4, ease: "easeOut" }}
          >
            <Label className="text-xs text-muted-foreground">View Mode</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={viewMode === 'original' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('original')}
                className="text-xs transition-all duration-200"
              >
                Original
              </Button>
              <Button
                variant={viewMode === 'isometric' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('isometric')}
                disabled={!hasIsometric}
                className="text-xs transition-all duration-200"
              >
                Isometric
              </Button>
              <Button
                variant={viewMode === '3d' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('3d')}
                disabled={!has3D}
                className="text-xs transition-all duration-200"
              >
                3D Model
              </Button>
              <Button
                variant={viewMode === 'split' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('split')}
                className="text-xs transition-all duration-200"
              >
                Compare
              </Button>
            </div>
          </motion.div>

          {/* Export Buttons */}
          {(hasIsometric || has3D) && (
            <motion.div
              className="mt-6 space-y-2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5, ease: "easeOut" }}
            >
              <Button variant="outline" size="sm" className="w-full transition-all duration-200 hover:border-primary/30">
                <Share2 className="w-4 h-4 mr-2" /> Share
              </Button>
              <Button size="sm" className="w-full bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300">
                <Download className="w-4 h-4 mr-2" /> Export
              </Button>
            </motion.div>
          )}
        </div>

        {/* Right Panel - Canvas */}
        <div className="flex-1 min-h-[60vh] lg:min-h-0 relative bg-black/80 dark-blueprint-grid overflow-hidden">
          <AnimatePresence mode="wait">
            {viewMode === 'original' && (
              <motion.div 
                key="original"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full flex items-center justify-center p-8"
              >
                <img 
                  src={model.originalUrl} 
                  alt="Original Floorplan" 
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                  data-testid="img-original"
                />
              </motion.div>
            )}

            {viewMode === 'isometric' && hasIsometric && (
              <motion.div 
                key="isometric"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full flex items-center justify-center p-8"
              >
                <img 
                  src={model.isometricUrl!} 
                  alt="Isometric View" 
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                  data-testid="img-isometric"
                />
              </motion.div>
            )}

            {viewMode === '3d' && (
              <motion.div 
                key="3d"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full"
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
                className="w-full h-full flex"
              >
                <div className="w-1/2 h-full border-r border-white/10 p-4 bg-white/5 flex flex-col">
                  <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium">Original</div>
                  <div className="flex-1 flex items-center justify-center">
                    <img src={model.originalUrl} alt="Original" className="max-w-full max-h-full object-contain" />
                  </div>
                </div>
                <div className="w-1/2 h-full p-4 flex flex-col">
                  <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium">
                    {hasIsometric ? 'Isometric' : 'Not Generated'}
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    {hasIsometric ? (
                      <img src={model.isometricUrl!} alt="Isometric" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <div className="text-muted-foreground text-center">
                        <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Generate isometric view first</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading Overlay */}
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-md"
            >
              <div className="text-center dark-glass-card rounded-2xl p-8 max-w-xs">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
                  <Loader2 className="w-8 h-8 absolute inset-0 m-auto text-primary animate-spin" />
                </div>
                <p className="text-lg font-medium">
                  {model.status === 'generating_isometric' ? 'Generating Isometric View...' :
                   model.status === 'retexturing' ? 'Enhancing Textures...' : 'Creating 3D Model...'}
                </p>
                <p className="text-sm text-muted-foreground mt-2">This may take a moment</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
      </PageTransition>

      {/* Paywall Modal */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => {
          setShowPaywall(false);
          invalidateSubscription(); // Refresh subscription data when modal closes
        }}
        trigger="limit_reached"
      />
    </Layout>
  );
}
