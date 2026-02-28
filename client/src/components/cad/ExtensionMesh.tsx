import { useMemo } from "react";
import type { CADExtensionParams, PropertyBaseParams } from "@/lib/cad/types";
import { generateExtensionGeometry, getExtensionPosition } from "@/lib/cad/geometry-generators";

interface ExtensionMeshProps {
  params: CADExtensionParams;
  propertyBase: PropertyBaseParams;
}

export function ExtensionMesh({ params, propertyBase }: ExtensionMeshProps) {
  const group = useMemo(() => {
    return generateExtensionGeometry(params);
  }, [
    params.type,
    params.depthM,
    params.widthM,
    params.heightM,
    params.wallThicknessM,
    params.roofType,
    params.roofPitchDeg,
    params.attachmentSide,
    params.offsetFromEdgeM,
    params.windows.length,
    params.doors.length,
  ]);

  const position = useMemo(() => {
    return getExtensionPosition(params, propertyBase);
  }, [params.attachmentSide, params.offsetFromEdgeM, params.depthM, params.widthM, propertyBase]);

  return <primitive object={group} position={position} />;
}
