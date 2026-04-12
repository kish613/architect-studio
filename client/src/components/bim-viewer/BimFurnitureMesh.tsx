import { Component, Suspense, useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import type { Fixture, Furniture } from "@shared/bim/canonical-schema";
import { FURNITURE_CATALOG } from "@/lib/pascal/furniture-catalog";
import { sceneRegistry } from "@/lib/pascal/scene-registry";
import { normalizeImportedModel } from "@/lib/pascal/model-normalization";
import {
  createBimAssetFallbackGeometry,
  getBimAssetFallbackMaterial,
  getBimAssetWorldTransform,
  type BimPlacedAsset,
} from "./systems/bim-furniture-system";

export type { BimPlacedAsset };

const _failedModelUrls = new Set<string>();

function resolveModelUrl(asset: BimPlacedAsset): string | null {
  if (asset.asset.glbUrl && asset.asset.glbUrl.length > 0) {
    return asset.asset.glbUrl;
  }
  const cat = FURNITURE_CATALOG.find((c) => c.id === asset.asset.catalogId);
  return cat?.modelUrl ?? null;
}

function BimAssetModelInner({
  asset,
  levelElevation,
}: {
  asset: BimPlacedAsset;
  levelElevation: number;
}) {
  const url = resolveModelUrl(asset)!;
  const { scene } = useGLTF(url);
  const d = asset.asset.dimensions;
  const { position, rotationY } = getBimAssetWorldTransform(asset, levelElevation);

  const normalizedScene = useMemo(() => {
    const normalized = normalizeImportedModel(scene, d);
    normalized.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const fixMaterial = (m: THREE.Material): THREE.Material => {
          const cloned = m.clone();
          if ("color" in cloned) {
            const col = (cloned as THREE.MeshStandardMaterial).color;
            if (col && col.r > 0.9 && col.g < 0.1 && col.b > 0.9) {
              return new THREE.MeshStandardMaterial({
                color: new THREE.Color("#888888"),
                roughness: 0.58,
                metalness: 0.02,
              });
            }
          }
          if ("map" in cloned) {
            const std = cloned as THREE.MeshStandardMaterial;
            const texImg = std.map?.image as { width?: number } | undefined;
            if (std.map && (!texImg || !texImg.width || texImg.width === 0)) {
              return new THREE.MeshStandardMaterial({
                color: new THREE.Color("#888888"),
                roughness: 0.6,
                metalness: 0.02,
              });
            }
          }
          if (cloned.type === "MeshBasicMaterial") {
            const basic = cloned as THREE.MeshBasicMaterial;
            return new THREE.MeshStandardMaterial({
              color: basic.color ?? new THREE.Color("#b78d63"),
              roughness: 0.6,
              metalness: 0.02,
            });
          }
          return cloned;
        };
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map(fixMaterial);
        } else if (mesh.material) {
          mesh.material = fixMaterial(mesh.material);
        }
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return normalized;
  }, [scene, d.x, d.y, d.z]);

  return (
    <group
      position={position}
      rotation={[0, rotationY, 0]}
      ref={(g) => {
        if (g) sceneRegistry.register(asset.id, g);
        else sceneRegistry.unregister(asset.id);
      }}
      userData={{ nodeId: asset.id }}
    >
      <primitive object={normalizedScene} />
    </group>
  );
}

class BimModelErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode; modelUrl: string; onError?: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn("[BimFurnitureMesh] GLB load failed", this.props.modelUrl, error.message);
    this.props.onError?.();
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function BimAssetFallbackMesh({
  asset,
  levelElevation,
  isSelected,
}: {
  asset: BimPlacedAsset;
  levelElevation: number;
  isSelected: boolean;
}) {
  const geometry = useMemo(() => createBimAssetFallbackGeometry(asset), [asset]);
  const material = useMemo(
    () => getBimAssetFallbackMaterial(asset, isSelected),
    [asset, isSelected],
  );
  const { position, rotationY } = getBimAssetWorldTransform(asset, levelElevation);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={position}
      rotation={[0, rotationY, 0]}
      castShadow
      receiveShadow
      ref={(mesh) => {
        if (mesh) sceneRegistry.register(asset.id, mesh);
        else sceneRegistry.unregister(asset.id);
      }}
      userData={{ nodeId: asset.id }}
    />
  );
}

export function BimFurnitureMesh({
  asset,
  levelElevation,
  isSelected,
}: {
  asset: Furniture | Fixture;
  levelElevation: number;
  isSelected: boolean;
}) {
  const modelUrl = resolveModelUrl(asset);
  const shouldLoad =
    modelUrl &&
    !_failedModelUrls.has(modelUrl) &&
    (modelUrl.startsWith("/") || modelUrl.startsWith("http"));

  if (shouldLoad) {
    return (
      <BimModelErrorBoundary
        fallback={<BimAssetFallbackMesh asset={asset} levelElevation={levelElevation} isSelected={isSelected} />}
        modelUrl={modelUrl}
        onError={() => _failedModelUrls.add(modelUrl)}
      >
        <Suspense fallback={<BimAssetFallbackMesh asset={asset} levelElevation={levelElevation} isSelected={isSelected} />}>
          <BimAssetModelInner asset={asset} levelElevation={levelElevation} />
        </Suspense>
      </BimModelErrorBoundary>
    );
  }

  return <BimAssetFallbackMesh asset={asset} levelElevation={levelElevation} isSelected={isSelected} />;
}

/** Preload catalog URLs for visible assets */
export function preloadBimAssetUrls(urls: string[]) {
  for (const u of urls) {
    if (u && !_failedModelUrls.has(u)) {
      try {
        useGLTF.preload(u);
      } catch {
        /* ignore */
      }
    }
  }
}
