import * as THREE from "three";
import type { Door, Wall } from "@shared/bim/canonical-schema";
import { resolveTextureId } from "@/lib/bim/texture-presets";
import {
  getTextureSetSync,
  prefetchTextureSet,
  applyPbrTextures,
} from "@/lib/bim/texture-service";

export interface BimDoorGeometries {
  frame: THREE.BufferGeometry;
  panel: THREE.BufferGeometry;
}

export function createBimDoorGeometries(door: Door): BimDoorGeometries {
  const w = door.width;
  const h = door.height;
  const depth = 0.12;
  const frame = new THREE.BoxGeometry(w + 0.06, h + 0.06, depth);
  const panel = new THREE.BoxGeometry(w - 0.04, h - 0.04, depth * 0.4);
  return { frame, panel };
}

export function getBimDoorPositionOnWall(
  door: Door,
  wall: Wall,
  levelElevation: number,
): THREE.Vector3 {
  const t = door.position;
  const x = wall.start.x + (wall.end.x - wall.start.x) * t;
  const z = wall.start.z + (wall.end.z - wall.start.z) * t;
  const y = levelElevation + door.height / 2;
  return new THREE.Vector3(x, y, z);
}

export function getBimDoorMaterials(isSelected: boolean): {
  frame: THREE.MeshPhysicalMaterial;
  panel: THREE.MeshPhysicalMaterial;
} {
  // Try to load wood textures for frame (Wood049) and panel (Wood066)
  const frameTextureId = resolveTextureId("door_frame");
  const panelTextureId = resolveTextureId("door_panel");

  const frameTextures = frameTextureId
    ? getTextureSetSync(frameTextureId)
    : null;
  const panelTextures = panelTextureId
    ? getTextureSetSync(panelTextureId)
    : null;

  // Prefetch if not cached
  if (frameTextureId && !frameTextures) {
    prefetchTextureSet(frameTextureId);
  }
  if (panelTextureId && !panelTextures) {
    prefetchTextureSet(panelTextureId);
  }

  // Frame: dark stained wood
  const frameProps: THREE.MeshPhysicalMaterialParameters = {
    color: "#6B4226",
    roughness: 0.7,
    metalness: 0,
    envMapIntensity: 0.35,
  };

  if (frameTextures?.albedo) {
    const pbrProps = applyPbrTextures(frameTextures, { x: 1, y: 1 });
    Object.assign(frameProps, pbrProps);
    // Tint toward the base color but let texture show
    frameProps.color = new THREE.Color("#6B4226").lerp(
      new THREE.Color("#ffffff"),
      0.4,
    );
  }

  if (isSelected) {
    frameProps.emissive = new THREE.Color("#4A90FF");
    frameProps.emissiveIntensity = 0.3;
  }

  // Panel: lighter warm wood with clearcoat (varnished look)
  const panelProps: THREE.MeshPhysicalMaterialParameters = {
    color: "#A0722A",
    roughness: 0.5,
    metalness: 0,
    clearcoat: 0.3,
    clearcoatRoughness: 0.4,
    envMapIntensity: 0.5,
  };

  if (panelTextures?.albedo) {
    const pbrProps = applyPbrTextures(panelTextures, { x: 1, y: 1 });
    Object.assign(panelProps, pbrProps);
    panelProps.color = new THREE.Color("#A0722A").lerp(
      new THREE.Color("#ffffff"),
      0.4,
    );
  }

  if (isSelected) {
    panelProps.emissive = new THREE.Color("#4A90FF");
    panelProps.emissiveIntensity = 0.3;
  }

  return {
    frame: new THREE.MeshPhysicalMaterial(frameProps),
    panel: new THREE.MeshPhysicalMaterial(panelProps),
  };
}
