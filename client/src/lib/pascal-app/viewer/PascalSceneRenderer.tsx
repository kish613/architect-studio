import { useEffect, useMemo, Suspense, Component, type ReactNode } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useScene } from "../core/use-scene";
import { useViewer } from "./use-viewer";
import { sceneRegistry } from "../core/scene-registry";
import { normalizeImportedModel } from "@/lib/pascal/model-normalization";
import { createWallGeometry, getWallTransform, getWallMaterial, getWallLength } from "@/components/viewer/systems/wall-system";
import { createDoorGeometries, getDoorPositionOnWall, getDoorMaterials } from "@/components/viewer/systems/door-system";
import { createWindowGeometries, getWindowPositionOnWall, getWindowMaterials } from "@/components/viewer/systems/window-system";
import { createSlabGeometry, getSlabMaterial } from "@/components/viewer/systems/slab-system";
import { createRoofGeometry, getRoofMaterial } from "@/components/viewer/systems/roof-system";
import { createItemGeometry, getItemTransform, getItemMaterial } from "@/components/viewer/systems/item-system";
import type {
  AnyNode,
  PascalWallNode,
  PascalDoorNode,
  PascalWindowNode,
  PascalSlabNode,
  PascalRoofNode,
  PascalItemNode,
  PascalLevelNode,
} from "../core/types";
import type { WallNode, DoorNode, WindowNode, SlabNode, RoofNode, ItemNode } from "@/lib/pascal/schemas";

// ── Adapters: convert Pascal tuple-format nodes to local {x,y,z} format ───

function adaptWall(p: PascalWallNode): WallNode {
  return {
    id: p.id,
    type: "wall",
    name: p.name,
    parentId: p.parentId,
    childIds: p.children ?? [],
    visible: p.visible,
    start: { x: p.start[0], y: 0, z: p.start[1] },
    end: { x: p.end[0], y: 0, z: p.end[1] },
    thickness: p.thickness,
    height: p.height,
  } as WallNode;
}

function adaptDoor(p: PascalDoorNode, wallMap: Record<string, PascalWallNode>): DoorNode {
  // Convert world position back to t-value along wall
  const wall = p.wallId ? wallMap[p.wallId] : null;
  let position = 0.5;
  if (wall) {
    const wdx = wall.end[0] - wall.start[0];
    const wdz = wall.end[1] - wall.start[1];
    const wLen = Math.sqrt(wdx * wdx + wdz * wdz);
    if (wLen > 0.001) {
      const dx = p.position[0] - wall.start[0];
      const dz = p.position[2] - wall.start[1];
      position = Math.max(0, Math.min(1, (dx * wdx + dz * wdz) / (wLen * wLen)));
    }
  }
  return {
    id: p.id,
    type: "door",
    name: p.name,
    parentId: p.parentId,
    childIds: [],
    visible: p.visible,
    wallId: p.wallId ?? "",
    position,
    width: p.width,
    height: p.height,
    swing: p.hingesSide as "left" | "right",
  } as DoorNode;
}

function adaptWindow(p: PascalWindowNode, wallMap: Record<string, PascalWallNode>): WindowNode {
  const wall = p.wallId ? wallMap[p.wallId] : null;
  let position = 0.5;
  if (wall) {
    const wdx = wall.end[0] - wall.start[0];
    const wdz = wall.end[1] - wall.start[1];
    const wLen = Math.sqrt(wdx * wdx + wdz * wdz);
    if (wLen > 0.001) {
      const dx = p.position[0] - wall.start[0];
      const dz = p.position[2] - wall.start[1];
      position = Math.max(0, Math.min(1, (dx * wdx + dz * wdz) / (wLen * wLen)));
    }
  }
  return {
    id: p.id,
    type: "window",
    name: p.name,
    parentId: p.parentId,
    childIds: [],
    visible: p.visible,
    wallId: p.wallId ?? "",
    position,
    width: p.width,
    height: p.height,
    sillHeight: p.position[1] ?? 0.9,
  } as WindowNode;
}

function adaptSlab(p: PascalSlabNode): SlabNode {
  return {
    id: p.id,
    type: "slab",
    name: p.name,
    parentId: p.parentId,
    childIds: [],
    visible: p.visible,
    points: p.polygon.map(([x, z]) => ({ x, y: 0, z })),
    transform: { position: { x: 0, y: 0, z: 0 } },
  } as SlabNode;
}

function adaptRoof(p: PascalRoofNode): RoofNode {
  return {
    id: p.id,
    type: "roof",
    name: p.name,
    parentId: p.parentId,
    childIds: p.children ?? [],
    visible: p.visible,
    transform: {
      position: { x: p.position[0], y: p.position[1], z: p.position[2] },
    },
  } as RoofNode;
}

function adaptItem(p: PascalItemNode): ItemNode {
  return {
    id: p.id,
    type: "item",
    name: p.name,
    parentId: p.parentId,
    childIds: p.children ?? [],
    visible: p.visible,
    transform: {
      position: { x: p.position[0], y: p.position[1], z: p.position[2] },
      rotation: { x: p.rotation[0], y: p.rotation[1], z: p.rotation[2] },
      scale: { x: p.scale[0], y: p.scale[1], z: p.scale[2] },
    },
    dimensions: {
      x: p.asset.dimensions[0],
      y: p.asset.dimensions[1],
      z: p.asset.dimensions[2],
    },
    catalogId: p.asset.id,
    itemType: p.asset.category,
    modelUrl: p.asset.src || undefined,
  } as ItemNode;
}

// ── Mesh components ──────────────────────────────────────────────────────

function PascalWallMesh({ node }: { node: PascalWallNode }) {
  const selectedIds = useViewer((s) => s.selection.selectedIds);
  const hoveredId = useViewer((s) => s.hoveredId);
  const local = useMemo(() => adaptWall(node), [node]);
  const isSelected = selectedIds.includes(node.id);
  const isHovered = hoveredId === node.id;
  const { position, rotationY } = getWallTransform(local);
  const geometry = useMemo(() => createWallGeometry(local), [local]);
  const material = useMemo(() => getWallMaterial(local, isSelected, isHovered, getWallLength(local)), [local, isSelected, isHovered]);

  useEffect(() => () => { geometry.dispose(); }, [geometry]);
  useEffect(() => () => { material.dispose(); }, [material]);

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={position}
      rotation={[0, rotationY, 0]}
      castShadow
      receiveShadow
      ref={(mesh) => {
        if (mesh) sceneRegistry.register(node.id, mesh);
        else sceneRegistry.unregister(node.id);
      }}
      userData={{ nodeId: node.id }}
    />
  );
}

function PascalDoorMesh({ node, wallMap }: { node: PascalDoorNode; wallMap: Record<string, PascalWallNode> }) {
  const selectedIds = useViewer((s) => s.selection.selectedIds);
  const isSelected = selectedIds.includes(node.id);
  const wall = node.wallId ? wallMap[node.wallId] : null;
  if (!wall) return null;
  const localDoor = useMemo(() => adaptDoor(node, wallMap), [node, wallMap]);
  const localWall = useMemo(() => adaptWall(wall), [wall]);
  const position = getDoorPositionOnWall(localDoor, localWall);
  const { frame, panel } = useMemo(() => createDoorGeometries(localDoor), [localDoor]);
  const materials = useMemo(() => getDoorMaterials(isSelected), [isSelected]);

  useEffect(() => () => { frame.dispose(); panel.dispose(); }, [frame, panel]);
  useEffect(() => () => { materials.frame.dispose(); materials.panel.dispose(); }, [materials]);

  const dx = wall.end[0] - wall.start[0];
  const dz = wall.end[1] - wall.start[1];
  const rotationY = -Math.atan2(dz, dx);

  return (
    <group
      position={position}
      rotation={[0, rotationY, 0]}
      ref={(g) => {
        if (g) sceneRegistry.register(node.id, g);
        else sceneRegistry.unregister(node.id);
      }}
      userData={{ nodeId: node.id }}
    >
      <mesh geometry={frame} material={materials.frame} castShadow />
      <mesh geometry={panel} material={materials.panel} castShadow />
    </group>
  );
}

function PascalWindowMesh({ node, wallMap }: { node: PascalWindowNode; wallMap: Record<string, PascalWallNode> }) {
  const selectedIds = useViewer((s) => s.selection.selectedIds);
  const isSelected = selectedIds.includes(node.id);
  const wall = node.wallId ? wallMap[node.wallId] : null;
  if (!wall) return null;
  const localWin = useMemo(() => adaptWindow(node, wallMap), [node, wallMap]);
  const localWall = useMemo(() => adaptWall(wall), [wall]);
  const position = getWindowPositionOnWall(localWin, localWall);
  const { frame, glass } = useMemo(() => createWindowGeometries(localWin), [localWin]);
  const materials = useMemo(() => getWindowMaterials(isSelected), [isSelected]);

  useEffect(() => () => { frame.dispose(); glass.dispose(); }, [frame, glass]);
  useEffect(() => () => { materials.frame.dispose(); materials.glass.dispose(); }, [materials]);

  const dx = wall.end[0] - wall.start[0];
  const dz = wall.end[1] - wall.start[1];
  const rotationY = -Math.atan2(dz, dx);

  return (
    <group
      position={position}
      rotation={[0, rotationY, 0]}
      ref={(g) => {
        if (g) sceneRegistry.register(node.id, g);
        else sceneRegistry.unregister(node.id);
      }}
      userData={{ nodeId: node.id }}
    >
      <mesh geometry={frame} material={materials.frame} />
      <mesh geometry={glass} material={materials.glass} />
    </group>
  );
}

function PascalSlabMesh({ node }: { node: PascalSlabNode }) {
  const selectedIds = useViewer((s) => s.selection.selectedIds);
  const isSelected = selectedIds.includes(node.id);
  const local = useMemo(() => adaptSlab(node), [node]);
  const geometry = useMemo(() => createSlabGeometry(local), [local]);
  const material = useMemo(() => getSlabMaterial(local, isSelected), [local, isSelected]);

  useEffect(() => () => { geometry?.dispose(); }, [geometry]);
  useEffect(() => () => { material.dispose(); }, [material]);

  if (!geometry) return null;

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[0, 0, 0]}
      receiveShadow
      ref={(mesh) => {
        if (mesh) sceneRegistry.register(node.id, mesh);
        else sceneRegistry.unregister(node.id);
      }}
      userData={{ nodeId: node.id }}
    />
  );
}

function PascalRoofMesh({ node }: { node: PascalRoofNode }) {
  const selectedIds = useViewer((s) => s.selection.selectedIds);
  const isSelected = selectedIds.includes(node.id);
  const local = useMemo(() => adaptRoof(node), [node]);
  const geometry = useMemo(() => createRoofGeometry(local), [local]);
  const material = useMemo(() => getRoofMaterial(local, isSelected), [local, isSelected]);

  useEffect(() => () => { geometry.dispose(); }, [geometry]);
  useEffect(() => () => { material.dispose(); }, [material]);

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[node.position[0], node.position[1], node.position[2]]}
      castShadow
      ref={(mesh) => {
        if (mesh) sceneRegistry.register(node.id, mesh);
        else sceneRegistry.unregister(node.id);
      }}
      userData={{ nodeId: node.id }}
    />
  );
}

function FallbackItemMesh({ node }: { node: PascalItemNode }) {
  const selectedIds = useViewer((s) => s.selection.selectedIds);
  const isSelected = selectedIds.includes(node.id);
  const local = useMemo(() => adaptItem(node), [node]);
  const geometry = useMemo(() => createItemGeometry(local), [local]);
  const material = useMemo(() => getItemMaterial(local, isSelected), [local, isSelected]);
  const { position, rotationY } = getItemTransform(local);

  useEffect(() => () => { geometry.dispose(); }, [geometry]);
  useEffect(() => () => { material.dispose(); }, [material]);

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={position}
      rotation={[0, rotationY, 0]}
      castShadow
      receiveShadow
      ref={(mesh) => {
        if (mesh) sceneRegistry.register(node.id, mesh);
        else sceneRegistry.unregister(node.id);
      }}
      userData={{ nodeId: node.id }}
    />
  );
}

function ItemModelMesh({ node }: { node: PascalItemNode }) {
  const selectedIds = useViewer((s) => s.selection.selectedIds);
  const isSelected = selectedIds.includes(node.id);
  const local = useMemo(() => adaptItem(node), [node]);
  const { scene } = useGLTF(node.asset.src);
  const { position, rotationY } = getItemTransform(local);
  const d = node.asset.dimensions;
  const normalizedScene = useMemo(() => {
    const dims = { x: d[0], y: d[1], z: d[2] };
    const normalized = normalizeImportedModel(scene, dims);
    normalized.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((m) => m.clone());
        } else if (mesh.material) {
          mesh.material = mesh.material.clone();
        }
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return normalized;
  }, [scene, d[0], d[1], d[2]]);

  return (
    <group
      position={position}
      rotation={[0, rotationY, 0]}
      ref={(g) => {
        if (g) sceneRegistry.register(node.id, g);
        else sceneRegistry.unregister(node.id);
      }}
      userData={{ nodeId: node.id }}
    >
      <primitive object={normalizedScene} />
      {isSelected && (
        <mesh>
          <boxGeometry args={[d[0] * 1.05, d[1] * 1.05, d[2] * 1.05]} />
          <meshBasicMaterial color="#4A90FF" wireframe transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  );
}

class ItemModelErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function PascalItemMesh({ node }: { node: PascalItemNode }) {
  if (node.asset.src) {
    return (
      <ItemModelErrorBoundary fallback={<FallbackItemMesh node={node} />}>
        <Suspense fallback={<FallbackItemMesh node={node} />}>
          <ItemModelMesh node={node} />
        </Suspense>
      </ItemModelErrorBoundary>
    );
  }
  return <FallbackItemMesh node={node} />;
}

// ── Zone overlay ─────────────────────────────────────────────────────────

function PascalZoneMesh({ node }: { node: { id: string; polygon: [number, number][]; color: string; visible: boolean } }) {
  if (!node.visible || node.polygon.length < 3) return null;

  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(node.polygon[0][0], node.polygon[0][1]);
    for (let i = 1; i < node.polygon.length; i++) {
      shape.lineTo(node.polygon[i][0], node.polygon[i][1]);
    }
    shape.closePath();
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [node.polygon]);

  useEffect(() => () => { geometry.dispose(); }, [geometry]);

  return (
    <mesh
      geometry={geometry}
      position={[0, 0.01, 0]}
      receiveShadow
      ref={(mesh) => {
        if (mesh) sceneRegistry.register(node.id, mesh);
        else sceneRegistry.unregister(node.id);
      }}
      userData={{ nodeId: node.id }}
    >
      <meshStandardMaterial color={node.color} transparent opacity={0.25} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ── Helper: find level index for exploded view ───────────────────────────

function findLevelForNode(nodeId: string, nodes: Record<string, AnyNode>): number {
  let current: AnyNode | undefined = nodes[nodeId];
  while (current) {
    if (current.type === "level") return (current as PascalLevelNode).level ?? 0;
    current = current.parentId ? nodes[current.parentId] : undefined;
  }
  return 0;
}

// ── Main scene renderer ──────────────────────────────────────────────────

export function PascalSceneRenderer() {
  const nodes = useScene((s) => s.nodes);
  const { levelMode, wallMode } = useViewer();

  useEffect(() => () => { sceneRegistry.clear(); }, []);

  const walls = useMemo(
    () => Object.values(nodes).filter((n): n is PascalWallNode => n.type === "wall" && n.visible),
    [nodes],
  );
  const wallMap = useMemo(
    () => Object.fromEntries(walls.map((w) => [w.id, w])) as Record<string, PascalWallNode>,
    [walls],
  );
  const doors = useMemo(
    () => Object.values(nodes).filter((n): n is PascalDoorNode => n.type === "door" && n.visible),
    [nodes],
  );
  const windows = useMemo(
    () => Object.values(nodes).filter((n): n is PascalWindowNode => n.type === "window" && n.visible),
    [nodes],
  );
  const slabs = useMemo(
    () => Object.values(nodes).filter((n): n is PascalSlabNode => n.type === "slab" && n.visible),
    [nodes],
  );
  const roofs = useMemo(
    () => Object.values(nodes).filter((n): n is PascalRoofNode => n.type === "roof" && n.visible),
    [nodes],
  );
  const items = useMemo(
    () => Object.values(nodes).filter((n): n is PascalItemNode => n.type === "item" && n.visible),
    [nodes],
  );
  const zones = useMemo(
    () => Object.values(nodes).filter((n) => n.type === "zone" && n.visible) as Array<{ id: string; polygon: [number, number][]; color: string; visible: boolean }>,
    [nodes],
  );

  const isExploded = levelMode === "exploded";
  const explodedSpacing = 3;

  const getOffset = (nodeId: string): [number, number, number] => {
    if (!isExploded) return [0, 0, 0];
    const lvl = findLevelForNode(nodeId, nodes);
    return [0, lvl * explodedSpacing, 0];
  };

  return (
    <group>
      {walls.map((w) => (
        <group key={w.id} position={getOffset(w.id)}>
          <PascalWallMesh node={w} />
        </group>
      ))}
      {doors.map((d) => (
        <group key={d.id} position={getOffset(d.id)}>
          <PascalDoorMesh node={d} wallMap={wallMap} />
        </group>
      ))}
      {windows.map((w) => (
        <group key={w.id} position={getOffset(w.id)}>
          <PascalWindowMesh node={w} wallMap={wallMap} />
        </group>
      ))}
      {slabs.map((s) => (
        <group key={s.id} position={getOffset(s.id)}>
          <PascalSlabMesh node={s} />
        </group>
      ))}
      {roofs.map((r) => (
        <group key={r.id} position={getOffset(r.id)}>
          <PascalRoofMesh node={r} />
        </group>
      ))}
      {items.map((i) => (
        <group key={i.id} position={getOffset(i.id)}>
          <PascalItemMesh node={i} />
        </group>
      ))}
      {zones.map((z) => (
        <group key={z.id} position={getOffset(z.id)}>
          <PascalZoneMesh node={z} />
        </group>
      ))}
    </group>
  );
}
