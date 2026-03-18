import { useEffect, useMemo, Suspense } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useScene } from "@/stores/use-scene";
import { useViewer } from "@/stores/use-viewer";
import { sceneRegistry } from "@/lib/pascal/scene-registry";
import { createWallGeometry, getWallTransform, getWallMaterial, getWallLength } from "./systems/wall-system";
import { createDoorGeometries, getDoorPositionOnWall, getDoorMaterials } from "./systems/door-system";
import { createWindowGeometries, getWindowPositionOnWall, getWindowMaterials } from "./systems/window-system";
import { createSlabGeometry, getSlabMaterial } from "./systems/slab-system";
import { createRoofGeometry, getRoofMaterial } from "./systems/roof-system";
import { createItemGeometry, getItemTransform, getItemMaterial } from "./systems/item-system";
import { WallDragHandles } from "./WallDragHandles";
import type { WallNode, DoorNode, WindowNode, SlabNode, RoofNode, ItemNode, LevelNode } from "@/lib/pascal/schemas";

function WallMesh({ node }: { node: WallNode }) {
  const selectedIds = useViewer((s) => s.selectedIds);
  const hoveredId = useViewer((s) => s.hoveredId);
  const isSelected = selectedIds.includes(node.id);
  const isHovered = hoveredId === node.id;
  const { position, rotationY } = getWallTransform(node);
  const geometry = useMemo(() => createWallGeometry(node), [node]);
  const material = useMemo(() => getWallMaterial(node, isSelected, isHovered, getWallLength(node)), [node, isSelected, isHovered]);

  useEffect(() => { return () => { geometry.dispose(); }; }, [geometry]);
  useEffect(() => { return () => { material.dispose(); }; }, [material]);

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

function DoorMesh({ node, walls }: { node: DoorNode; walls: Record<string, WallNode> }) {
  const selectedIds = useViewer((s) => s.selectedIds);
  const isSelected = selectedIds.includes(node.id);
  const wall = walls[node.wallId];
  if (!wall) return null;
  const position = getDoorPositionOnWall(node, wall);
  const { frame, panel } = useMemo(() => createDoorGeometries(node), [node]);
  const materials = useMemo(() => getDoorMaterials(isSelected), [isSelected]);

  useEffect(() => { return () => { frame.dispose(); panel.dispose(); }; }, [frame, panel]);
  useEffect(() => { return () => { materials.frame.dispose(); materials.panel.dispose(); }; }, [materials]);

  const dx = wall.end.x - wall.start.x;
  const dz = wall.end.z - wall.start.z;
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

function WindowMesh({ node, walls }: { node: WindowNode; walls: Record<string, WallNode> }) {
  const selectedIds = useViewer((s) => s.selectedIds);
  const isSelected = selectedIds.includes(node.id);
  const wall = walls[node.wallId];
  if (!wall) return null;
  const position = getWindowPositionOnWall(node, wall);
  const { frame, glass } = useMemo(() => createWindowGeometries(node), [node]);
  const materials = useMemo(() => getWindowMaterials(isSelected), [isSelected]);

  useEffect(() => { return () => { frame.dispose(); glass.dispose(); }; }, [frame, glass]);
  useEffect(() => { return () => { materials.frame.dispose(); materials.glass.dispose(); }; }, [materials]);

  const dx = wall.end.x - wall.start.x;
  const dz = wall.end.z - wall.start.z;
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

function SlabMesh({ node }: { node: SlabNode }) {
  const selectedIds = useViewer((s) => s.selectedIds);
  const isSelected = selectedIds.includes(node.id);
  const geometry = useMemo(() => createSlabGeometry(node), [node]);
  const material = useMemo(() => getSlabMaterial(isSelected), [isSelected]);

  useEffect(() => { return () => { geometry?.dispose(); }; }, [geometry]);
  useEffect(() => { return () => { material.dispose(); }; }, [material]);

  if (!geometry) return null;
  const pos = node.transform?.position ?? { x: 0, y: 0, z: 0 };

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[pos.x, pos.y, pos.z]}
      receiveShadow
      ref={(mesh) => {
        if (mesh) sceneRegistry.register(node.id, mesh);
        else sceneRegistry.unregister(node.id);
      }}
      userData={{ nodeId: node.id }}
    />
  );
}

function RoofMesh({ node }: { node: RoofNode }) {
  const selectedIds = useViewer((s) => s.selectedIds);
  const isSelected = selectedIds.includes(node.id);
  const geometry = useMemo(() => createRoofGeometry(node), [node]);
  const material = useMemo(() => getRoofMaterial(isSelected), [isSelected]);

  useEffect(() => { return () => { geometry.dispose(); }; }, [geometry]);
  useEffect(() => { return () => { material.dispose(); }; }, [material]);

  const pos = node.transform?.position ?? { x: 0, y: 0, z: 0 };

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[pos.x, pos.y, pos.z]}
      castShadow
      ref={(mesh) => {
        if (mesh) sceneRegistry.register(node.id, mesh);
        else sceneRegistry.unregister(node.id);
      }}
      userData={{ nodeId: node.id }}
    />
  );
}

function FallbackItemMesh({ node }: { node: ItemNode }) {
  const selectedIds = useViewer((s) => s.selectedIds);
  const isSelected = selectedIds.includes(node.id);
  const geometry = useMemo(() => createItemGeometry(node), [node]);
  const material = useMemo(() => getItemMaterial(node, isSelected), [node, isSelected]);

  useEffect(() => { return () => { geometry.dispose(); }; }, [geometry]);
  useEffect(() => { return () => { material.dispose(); }; }, [material]);

  const { position } = getItemTransform(node);

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={position}
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

function ItemModelMesh({ node }: { node: ItemNode }) {
  const selectedIds = useViewer((s) => s.selectedIds);
  const isSelected = selectedIds.includes(node.id);
  const { scene } = useGLTF(node.modelUrl!);
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        // Deep clone materials so each instance is independent
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map(m => m.clone());
        } else if (mesh.material) {
          mesh.material = mesh.material.clone();
        }
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);
  const { position } = getItemTransform(node);
  const d = node.dimensions ?? { x: 1, y: 1, z: 1 };

  return (
    <group
      position={position}
      ref={(g) => {
        if (g) sceneRegistry.register(node.id, g);
        else sceneRegistry.unregister(node.id);
      }}
      userData={{ nodeId: node.id }}
    >
      <primitive object={clonedScene} scale={[d.x, d.y, d.z]} />
      {isSelected && (
        <mesh>
          <boxGeometry args={[d.x * 1.05, d.y * 1.05, d.z * 1.05]} />
          <meshBasicMaterial color="#4A90FF" wireframe transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  );
}

function ItemMesh({ node }: { node: ItemNode }) {
  if (node.modelUrl) {
    return (
      <Suspense fallback={<FallbackItemMesh node={node} />}>
        <ItemModelMesh node={node} />
      </Suspense>
    );
  }
  return <FallbackItemMesh node={node} />;
}

// Find which level a node belongs to by tracing parentId upward
function findLevelIndex(nodeId: string, nodes: Record<string, any>): number {
  let current = nodes[nodeId];
  while (current) {
    if (current.type === "level") return (current as LevelNode).index ?? 0;
    current = current.parentId ? nodes[current.parentId] : null;
  }
  return 0;
}

export function SceneRenderer() {
  useEffect(() => {
    return () => { sceneRegistry.clear(); };
  }, []);

  const nodes = useScene((s) => s.nodes);
  const showWalls = useViewer((s) => s.showWalls);
  const showSlabs = useViewer((s) => s.showSlabs);
  const showRoofs = useViewer((s) => s.showRoofs);
  const showItems = useViewer((s) => s.showItems);
  const selectedIds = useViewer((s) => s.selectedIds);
  const levelMode = useViewer((s) => s.levelMode);
  const explodedSpacing = useViewer((s) => s.explodedSpacing);

  const walls = useMemo(
    () => Object.values(nodes).filter((n): n is WallNode => n.type === "wall"),
    [nodes]
  );
  const wallMap = useMemo(
    () => Object.fromEntries(walls.map((w) => [w.id, w])) as Record<string, WallNode>,
    [walls]
  );
  const doors = useMemo(
    () => Object.values(nodes).filter((n): n is DoorNode => n.type === "door"),
    [nodes]
  );
  const windows = useMemo(
    () => Object.values(nodes).filter((n): n is WindowNode => n.type === "window"),
    [nodes]
  );
  const slabs = useMemo(
    () => Object.values(nodes).filter((n): n is SlabNode => n.type === "slab"),
    [nodes]
  );
  const roofs = useMemo(
    () => Object.values(nodes).filter((n): n is RoofNode => n.type === "roof"),
    [nodes]
  );
  const items = useMemo(
    () => Object.values(nodes).filter((n): n is ItemNode => n.type === "item"),
    [nodes]
  );

  const isExploded = levelMode === "exploded";

  // Compute Y offset for exploded view
  const getOffset = (nodeId: string): [number, number, number] => {
    if (!isExploded) return [0, 0, 0];
    const lvlIdx = findLevelIndex(nodeId, nodes);
    return [0, lvlIdx * explodedSpacing, 0];
  };

  return (
    <group>
      {showWalls && walls.map((w) => (
        <group key={w.id} position={getOffset(w.id)}>
          <WallMesh node={w} />
        </group>
      ))}
      {showWalls && doors.map((d) => (
        <group key={d.id} position={getOffset(d.id)}>
          <DoorMesh node={d} walls={wallMap} />
        </group>
      ))}
      {showWalls && windows.map((w) => (
        <group key={w.id} position={getOffset(w.id)}>
          <WindowMesh node={w} walls={wallMap} />
        </group>
      ))}
      {showSlabs && slabs.map((s) => (
        <group key={s.id} position={getOffset(s.id)}>
          <SlabMesh node={s} />
        </group>
      ))}
      {showRoofs && roofs.map((r) => (
        <group key={r.id} position={getOffset(r.id)}>
          <RoofMesh node={r} />
        </group>
      ))}
      {showItems && items.map((i) => (
        <group key={i.id} position={getOffset(i.id)}>
          <ItemMesh node={i} />
        </group>
      ))}
      {/* Drag handles for selected walls */}
      {walls
        .filter((w) => selectedIds.includes(w.id))
        .map((w) => (
          <WallDragHandles key={`handles-${w.id}`} wall={w} />
        ))}
    </group>
  );
}
