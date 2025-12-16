import { Suspense, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, Center, ContactShadows, Html, useProgress } from "@react-three/drei";
import { Box, Download, ExternalLink, AlertCircle, Smartphone, Image, Cuboid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isMobileDevice } from "@/lib/utils";
import * as THREE from "three";

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white text-sm">{progress.toFixed(0)}% loaded</p>
      </div>
    </Html>
  );
}

interface ModelProps {
  url: string;
  onError?: () => void;
}

function Model({ url, onError }: ModelProps) {
  const { scene } = useGLTF(url);
  const modelRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    if (modelRef.current) {
      modelRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
    }
  });

  return (
    <Center>
      <group ref={modelRef}>
        <primitive object={scene} scale={1} />
      </group>
    </Center>
  );
}

interface Model3DViewerProps {
  modelUrl: string;
  isometricUrl?: string;
  className?: string;
}

function ModelErrorFallback({ modelUrl }: { modelUrl: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-zinc-900 to-black">
      <div className="text-center p-8 max-w-md">
        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
        <h3 className="text-xl font-medium text-white mb-2">3D Viewer Loading</h3>
        <p className="text-sm text-white/60 mb-6">
          Your 3D model is ready! Download it to view in your favorite 3D software.
        </p>
        <div className="flex flex-col gap-3">
          <a href={modelUrl} download target="_blank" rel="noopener noreferrer">
            <Button className="w-full bg-primary hover:bg-primary/90" data-testid="button-download-glb-fallback">
              <Download className="w-4 h-4 mr-2" />
              Download GLB Model
            </Button>
          </a>
          <a href={modelUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="w-full" data-testid="button-open-new-tab">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in New Tab
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}

interface MobileModel3DViewProps {
  modelUrl: string;
  isometricUrl?: string;
}

function MobileModel3DView({ modelUrl, isometricUrl }: MobileModel3DViewProps) {
  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-b from-zinc-900 to-black overflow-auto">
      {/* Header */}
      <div className="p-4 border-b border-white/10 text-center">
        <div className="flex items-center justify-center gap-2 text-primary mb-1">
          <Cuboid className="w-5 h-5" />
          <span className="font-medium">3D Model Ready</span>
        </div>
        <p className="text-xs text-white/60">
          Download to view in a 3D app
        </p>
      </div>

      {/* Preview Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {isometricUrl ? (
          <div className="relative w-full max-w-sm mb-6">
            <img 
              src={isometricUrl} 
              alt="Isometric Preview" 
              className="w-full rounded-lg shadow-2xl border border-white/10"
              data-testid="img-isometric-preview-mobile"
            />
            <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs text-white/80 flex items-center gap-1">
              <Image className="w-3 h-3" />
              Preview
            </div>
          </div>
        ) : (
          <div className="w-full max-w-sm h-48 bg-white/5 rounded-lg flex items-center justify-center mb-6 border border-white/10">
            <Cuboid className="w-16 h-16 text-primary/40" />
          </div>
        )}

        {/* Download Actions */}
        <div className="w-full max-w-sm space-y-3">
          <a 
            href={modelUrl} 
            download 
            target="_blank" 
            rel="noopener noreferrer"
            className="block"
          >
            <Button 
              className="w-full bg-primary hover:bg-primary/90 h-12 text-base" 
              data-testid="button-download-glb-mobile"
            >
              <Download className="w-5 h-5 mr-2" />
              Download 3D Model
            </Button>
          </a>
          
          <a 
            href={modelUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="block"
          >
            <Button 
              variant="outline" 
              className="w-full h-12 text-base" 
              data-testid="button-open-external-mobile"
            >
              <ExternalLink className="w-5 h-5 mr-2" />
              Open in Browser
            </Button>
          </a>
        </div>
      </div>

      {/* Info Footer */}
      <div className="p-4 bg-white/5 border-t border-white/10">
        <div className="flex items-start gap-3 max-w-sm mx-auto">
          <div className="mt-0.5">
            <Smartphone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-white/90 font-medium mb-1">
              View on Desktop for Best Experience
            </p>
            <p className="text-xs text-white/60">
              The interactive 3D viewer works best on desktop browsers. Download the GLB file to open in Blender, Sketchfab, or other 3D apps.
            </p>
          </div>
        </div>
      </div>

      {/* App Suggestions */}
      <div className="p-4 border-t border-white/10">
        <p className="text-xs text-white/50 text-center mb-3">Open with:</p>
        <div className="flex justify-center gap-4 text-xs text-white/70">
          <span className="px-3 py-1.5 bg-white/5 rounded-full">Blender</span>
          <span className="px-3 py-1.5 bg-white/5 rounded-full">Sketchfab</span>
          <span className="px-3 py-1.5 bg-white/5 rounded-full">3D Viewer</span>
        </div>
      </div>
    </div>
  );
}

function getProxiedUrl(url: string): string {
  if (url.includes('meshy.ai')) {
    return `/api/proxy-model?url=${encodeURIComponent(url)}`;
  }
  return url;
}

export function Model3DViewer({ modelUrl, isometricUrl, className = "" }: Model3DViewerProps) {
  const [hasError, setHasError] = useState(false);
  // Initialize mobile state immediately to prevent WebGL canvas from mounting on mobile
  const [isMobile] = useState(() => isMobileDevice());
  const proxiedUrl = getProxiedUrl(modelUrl);

  // Show mobile-friendly view on mobile devices
  if (isMobile) {
    return <MobileModel3DView modelUrl={modelUrl} isometricUrl={isometricUrl} />;
  }

  if (hasError) {
    return <ModelErrorFallback modelUrl={modelUrl} />;
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [5, 5, 5], fov: 50 }}
        gl={{ preserveDrawingBuffer: true }}
        data-testid="canvas-3d-viewer"
        onError={() => setHasError(true)}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <pointLight position={[-10, -10, -5]} intensity={0.5} />
        
        <Suspense fallback={<Loader />}>
          <Model url={proxiedUrl} onError={() => setHasError(true)} />
          <Environment preset="city" />
        </Suspense>
        
        <ContactShadows position={[0, -1.5, 0]} opacity={0.5} blur={2} />
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={2}
          maxDistance={20}
        />
      </Canvas>

      {/* Controls overlay */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        <a href={modelUrl} download target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="secondary" className="backdrop-blur-md bg-black/40" data-testid="button-download-glb-desktop">
            <Download className="w-4 h-4 mr-2" />
            Download GLB
          </Button>
        </a>
      </div>

      {/* Help text */}
      <div className="absolute top-4 left-4 text-xs text-white/60 backdrop-blur-md bg-black/30 px-3 py-2 rounded-lg">
        <p>Drag to rotate • Scroll to zoom • Right-click to pan</p>
      </div>
    </div>
  );
}

export function Model3DPlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-black/50">
      <div className="text-center">
        <Box className="w-16 h-16 mx-auto mb-4 text-primary/50" />
        <p className="text-lg font-medium text-white/80">3D Model Not Available</p>
        <p className="text-sm text-white/50 mt-2">Generate a 3D model first</p>
      </div>
    </div>
  );
}
