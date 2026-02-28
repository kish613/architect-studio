import { useMemo } from "react";
import type { PropertyBaseParams } from "@/lib/cad/types";
import { generatePropertyBase } from "@/lib/cad/geometry-generators";

interface PropertyBaseMeshProps {
  params: PropertyBaseParams;
}

export function PropertyBaseMesh({ params }: PropertyBaseMeshProps) {
  const group = useMemo(() => {
    return generatePropertyBase(params);
  }, [params.widthM, params.depthM, params.heightM, params.stories]);

  return <primitive object={group} />;
}
