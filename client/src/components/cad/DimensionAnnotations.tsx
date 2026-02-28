import { Html } from "@react-three/drei";
import type { CADExtensionParams, PropertyBaseParams } from "@/lib/cad/types";
import { getExtensionPosition } from "@/lib/cad/geometry-generators";

interface DimensionAnnotationsProps {
  extensions: CADExtensionParams[];
  property: PropertyBaseParams;
  visible: boolean;
}

function DimensionLabel({ position, text }: { position: [number, number, number]; text: string }) {
  return (
    <Html position={position} center distanceFactor={15}>
      <div className="bg-black/80 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded font-mono whitespace-nowrap border border-white/20">
        {text}
      </div>
    </Html>
  );
}

export function DimensionAnnotations({ extensions, property, visible }: DimensionAnnotationsProps) {
  if (!visible) return null;

  return (
    <group>
      {/* Property base dimensions */}
      <DimensionLabel
        position={[0, -0.3, property.depthM / 2 + 0.5]}
        text={`${property.widthM.toFixed(1)}m`}
      />
      <DimensionLabel
        position={[property.widthM / 2 + 0.5, -0.3, 0]}
        text={`${property.depthM.toFixed(1)}m`}
      />

      {/* Extension dimensions */}
      {extensions.map((ext, i) => {
        const pos = getExtensionPosition(ext, property);
        return (
          <group key={i}>
            {/* Depth label */}
            <DimensionLabel
              position={[
                pos.x + ext.widthM / 2 + 0.5,
                ext.heightM / 2,
                pos.z,
              ]}
              text={`${ext.depthM.toFixed(1)}m`}
            />
            {/* Width label */}
            <DimensionLabel
              position={[
                pos.x,
                -0.3,
                pos.z + ext.depthM / 2 + 0.5,
              ]}
              text={`${ext.widthM.toFixed(1)}m`}
            />
            {/* Height label */}
            <DimensionLabel
              position={[
                pos.x - ext.widthM / 2 - 0.5,
                ext.heightM / 2,
                pos.z - ext.depthM / 2,
              ]}
              text={`${ext.heightM.toFixed(1)}m`}
            />
            {/* Area label */}
            <DimensionLabel
              position={[
                pos.x,
                ext.heightM + 1,
                pos.z,
              ]}
              text={`${(ext.depthM * ext.widthM).toFixed(1)}m\u00B2`}
            />
          </group>
        );
      })}
    </group>
  );
}
