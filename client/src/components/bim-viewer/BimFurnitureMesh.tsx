import { Component, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import type { Fixture, Furniture } from "@shared/bim/canonical-schema";
import { FURNITURE_CATALOG } from "@/lib/pascal/furniture-catalog";
import { sceneRegistry } from "@/lib/pascal/scene-registry";
import { normalizeImportedModel } from "@/lib/pascal/model-normalization";
import { getPolyHavenGltfUrl } from "@/lib/bim/polyhaven-service";
import {
  createBimAssetFallbackGeometry,
  getBimAssetFallbackMaterial,
  getBimAssetWorldTransform,
  type BimPlacedAsset,
} from "./systems/bim-furniture-system";

export type { BimPlacedAsset };

const _failedModelUrls = new Set<string>();

// ─────────────────────────────────────────────────────────────
// Poly Haven model ID detection
// ─────────────────────────────────────────────────────────────

/**
 * Check whether an asset was placed from the Poly Haven catalog.
 * Convention: catalogId is prefixed with "ph:" for Poly Haven assets.
 */
function isPolyHavenAsset(asset: BimPlacedAsset): boolean {
  return (
    asset.asset.catalogId.startsWith("ph:") ||
    asset.asset.provenance === "polyhaven"
  );
}

/** Extract the raw Poly Haven ID from our prefixed catalogId. */
function extractPolyHavenId(asset: BimPlacedAsset): string {
  const catalogId = asset.asset.catalogId;
  return catalogId.startsWith("ph:") ? catalogId.slice(3) : catalogId;
}

// ─────────────────────────────────────────────────────────────
// URL resolution
// ─────────────────────────────────────────────────────────────

function resolveModelUrl(asset: BimPlacedAsset): string | null {
  // Prefer explicit glbUrl (works for both local and pre-cached Poly Haven)
  if (asset.asset.glbUrl && asset.asset.glbUrl.length > 0) {
    return asset.asset.glbUrl;
  }
  // Fall back to the local catalog
  const cat = FURNITURE_CATALOG.find((c) => c.id === asset.asset.catalogId);
  return cat?.modelUrl ?? null;
}

// ─────────────────────────────────────────────────────────────
// Poly Haven async model loader
// ─────────────────────────────────────────────────────────────

/**
 * Wrapper that resolves the Poly Haven .gltf CDN URL asynchronously,
 * then hands it directly to useGLTF. We MUST NOT cache the .gltf file
 * as a blob — it references external .bin and texture files via relative
 * paths, which only resolve correctly against the original CDN URL.
 * drei's useGLTF has its own in-session cache.
 */
function PolyHavenModelLoader({
  asset,
  levelElevation,
  isSelected,
}: {
  asset: BimPlacedAsset;
  levelElevation: number;
  isSelected: boolean;
}) {
  const phId = extractPolyHavenId(asset);
  const [gltfUrl, setGltfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      const url = await getPolyHavenGltfUrl(phId, "1k");
      if (cancelled) return;
      if (url) {
        setGltfUrl(url);
      } else {
        setFailed(true);
      }
      setLoading(false);
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [phId]);

  if (loading || failed || !gltfUrl || _failedModelUrls.has(gltfUrl)) {
    return (
      <BimAssetFallbackMesh
        asset={asset}
        levelElevation={levelElevation}
        isSelected={isSelected}
      />
    );
  }

  return (
    <BimModelErrorBoundary
      fallback={
        <BimAssetFallbackMesh
          asset={asset}
          levelElevation={levelElevation}
          isSelected={isSelected}
        />
      }
      modelUrl={gltfUrl}
      onError={() => _failedModelUrls.add(gltfUrl)}
    >
      <Suspense
        fallback={
          <BimAssetFallbackMesh
            asset={asset}
            levelElevation={levelElevation}
            isSelected={isSelected}
          />
        }
      >
        <BimAssetModelInner
          asset={asset}
          levelElevation={levelElevation}
          urlOverride={gltfUrl}
        />
      </Suspense>
    </BimModelErrorBoundary>
  );
}

// ─────────────────────────────────────────────────────────────
// Inner model renderer
// ─────────────────────────────────────────────────────────────

function BimAssetModelInner({
  asset,
  levelElevation,
  urlOverride,
}: {
  asset: BimPlacedAsset;
  levelElevation: number;
  urlOverride?: string;
}) {
  const url = urlOverride ?? resolveModelUrl(asset)!;
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

// ─────────────────────────────────────────────────────────────
// Error boundary
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// Fallback mesh
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────

export function BimFurnitureMesh({
  asset,
  levelElevation,
  isSelected,
}: {
  asset: Furniture | Fixture;
  levelElevation: number;
  isSelected: boolean;
}) {
  // Poly Haven assets are resolved asynchronously
  if (isPolyHavenAsset(asset)) {
    return (
      <PolyHavenModelLoader
        asset={asset}
        levelElevation={levelElevation}
        isSelected={isSelected}
      />
    );
  }

  // Local models — existing synchronous path
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
