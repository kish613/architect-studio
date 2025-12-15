import { Suspense, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, Center, ContactShadows, Html, useProgress } from "@react-three/drei";
import { Box, Download, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
            <Button className="w-full bg-primary hover:bg-primary/90">
              <Download className="w-4 h-4 mr-2" />
              Download GLB Model
            </Button>
          </a>
          <a href={modelUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="w-full">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in New Tab
            </Button>
          </a>
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

export function Model3DViewer({ modelUrl, className = "" }: Model3DViewerProps) {
  const [hasError, setHasError] = useState(false);
  const proxiedUrl = getProxiedUrl(modelUrl);

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
          <Button size="sm" variant="secondary" className="backdrop-blur-md bg-black/40">
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
