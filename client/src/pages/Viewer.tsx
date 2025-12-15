import { useParams, Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { useFloorplanStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Share2, Layers, RotateCw } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Viewer() {
  const { id } = useParams();
  const project = useFloorplanStore((state) => state.getProject(id || ""));
  const [viewMode, setViewMode] = useState<'3d' | '2d' | 'split'>('3d');

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

  const model = project.models[0]; // Assuming single model for MVP

  return (
    <Layout>
      <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden">
        {/* Toolbar */}
        <div className="h-16 border-b border-border/40 flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm z-10">
          <div className="flex items-center gap-4">
            <Link href="/projects">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-display font-semibold text-lg">{project.name}</h1>
              <p className="text-xs text-muted-foreground">Generated {new Date(model.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-black/20 p-1 rounded-lg border border-white/5">
            <Button 
              variant={viewMode === '2d' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setViewMode('2d')}
              className="text-xs"
            >
              2D Plan
            </Button>
            <Button 
              variant={viewMode === '3d' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setViewMode('3d')}
              className="text-xs"
            >
              3D Render
            </Button>
            <Button 
              variant={viewMode === 'split' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setViewMode('split')}
              className="text-xs"
            >
              Split View
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="hidden sm:flex">
              <Share2 className="w-4 h-4 mr-2" /> Share
            </Button>
            <Button size="sm" className="bg-primary text-white hover:bg-primary/90">
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative bg-black/80 overflow-hidden">
          
          <AnimatePresence mode="wait">
            {viewMode === '3d' && (
              <motion.div 
                key="3d"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full"
              >
                <img src={model.renderUrl} alt="3D Render" className="w-full h-full object-contain" />
              </motion.div>
            )}

            {viewMode === '2d' && (
              <motion.div 
                key="2d"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full p-8"
              >
                <div className="w-full h-full border border-white/10 bg-white/5 rounded-lg flex items-center justify-center">
                  <img src={model.originalUrl} alt="2D Plan" className="max-w-full max-h-full object-contain filter invert opacity-80" />
                </div>
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
                 <div className="w-1/2 h-full border-r border-white/10 p-4 bg-white/5">
                    <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium">Original Floorplan</div>
                    <div className="w-full h-[calc(100%-24px)] flex items-center justify-center">
                      <img src={model.originalUrl} alt="2D Plan" className="max-w-full max-h-full object-contain filter invert opacity-80" />
                    </div>
                 </div>
                 <div className="w-1/2 h-full p-4">
                    <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium">AI Render</div>
                    <div className="w-full h-[calc(100%-24px)] flex items-center justify-center">
                      <img src={model.renderUrl} alt="3D Render" className="max-w-full max-h-full object-contain" />
                    </div>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating Controls Overlay (Decorative) */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 bg-black/60 backdrop-blur-md rounded-full border border-white/10 shadow-2xl">
            <RotateCw className="w-5 h-5 text-white cursor-pointer hover:text-primary transition-colors" />
            <div className="w-px h-4 bg-white/20" />
            <Layers className="w-5 h-5 text-white cursor-pointer hover:text-primary transition-colors" />
          </div>
        </div>
      </div>
    </Layout>
  );
}
