import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { useCADStore } from "@/hooks/use-cad-params";
import { exportSTL } from "@/lib/cad/stl-exporter";
import { generateExtensionGeometry, getExtensionPosition, generatePropertyBase } from "@/lib/cad/geometry-generators";
import {
  Download,
  Ruler,
  Grid3x3,
  RotateCcw,
} from "lucide-react";
import * as THREE from "three";

export function CADToolbar() {
  const { sceneParams, toggleDimensions, toggleWireframe, reset } = useCADStore();

  const handleExportSTL = () => {
    const exportGroup = new THREE.Group();

    // Add property base
    const propertyMesh = generatePropertyBase(sceneParams.property);
    exportGroup.add(propertyMesh);

    // Add all extensions
    sceneParams.extensions.forEach((ext) => {
      const extGroup = generateExtensionGeometry(ext);
      const pos = getExtensionPosition(ext, sceneParams.property);
      extGroup.position.copy(pos);
      exportGroup.add(extGroup);
    });

    exportSTL(exportGroup, "extension-model.stl");
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs bg-black/40 border-white/10 text-white hover:bg-white/10"
        onClick={handleExportSTL}
      >
        <Download className="w-3.5 h-3.5" />
        Export STL
      </Button>

      <Button
        variant="outline"
        size="sm"
        className={`gap-1.5 text-xs border-white/10 hover:bg-white/10 ${
          sceneParams.showDimensions ? "bg-primary/20 text-primary border-primary/30" : "bg-black/40 text-white"
        }`}
        onClick={toggleDimensions}
      >
        <Ruler className="w-3.5 h-3.5" />
        Dimensions
      </Button>

      <Button
        variant="outline"
        size="sm"
        className={`gap-1.5 text-xs border-white/10 hover:bg-white/10 ${
          sceneParams.showWireframe ? "bg-primary/20 text-primary border-primary/30" : "bg-black/40 text-white"
        }`}
        onClick={toggleWireframe}
      >
        <Grid3x3 className="w-3.5 h-3.5" />
        Wireframe
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs bg-black/40 border-white/10 text-white hover:bg-white/10"
        onClick={reset}
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Reset
      </Button>
    </div>
  );
}
