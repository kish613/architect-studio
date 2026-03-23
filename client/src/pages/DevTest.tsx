import { useEffect } from "react";
import { FloorplanCanvas } from "@/components/viewer/FloorplanCanvas";
import { useScene } from "@/stores/use-scene";
import { createEmptyScene, createNode } from "@/lib/pascal/schemas";
import type { SceneData, WallNode, DoorNode, WindowNode, ItemNode, SlabNode } from "@/lib/pascal/schemas";

function buildTestScene(): SceneData {
  const scene = createEmptyScene();
  const nodes = { ...scene.nodes };

  // Find the level node
  const levelId = Object.values(nodes).find(n => n.type === "level")!.id;

  // Create a simple room with 4 walls
  const w1 = createNode("wall", { name: "Wall North", parentId: levelId, start: { x: 0, y: 0, z: 0 }, end: { x: 6, y: 0, z: 0 }, height: 2.7, thickness: 0.15 }) as WallNode;
  const w2 = createNode("wall", { name: "Wall East", parentId: levelId, start: { x: 6, y: 0, z: 0 }, end: { x: 6, y: 0, z: 5 }, height: 2.7, thickness: 0.15 }) as WallNode;
  const w3 = createNode("wall", { name: "Wall South", parentId: levelId, start: { x: 6, y: 0, z: 5 }, end: { x: 0, y: 0, z: 5 }, height: 2.7, thickness: 0.15 }) as WallNode;
  const w4 = createNode("wall", { name: "Wall West", parentId: levelId, start: { x: 0, y: 0, z: 5 }, end: { x: 0, y: 0, z: 0 }, height: 2.7, thickness: 0.15 }) as WallNode;

  // Add a door on wall 1
  const door = createNode("door", { name: "Front Door", parentId: levelId, wallId: w1.id, position: 0.4, width: 0.9, height: 2.1, doorType: "single" }) as DoorNode;
  w1.childIds = [door.id];

  // Add a window on wall 3
  const win = createNode("window", { name: "Window", parentId: levelId, wallId: w3.id, position: 0.5, width: 1.2, height: 1.2, sillHeight: 0.9 }) as WindowNode;
  w3.childIds = [win.id];

  // Add a slab (floor)
  const slab = createNode("slab", { name: "Floor", parentId: levelId, points: [
    { x: 0, y: 0, z: 0 }, { x: 6, y: 0, z: 0 }, { x: 6, y: 0, z: 5 }, { x: 0, y: 0, z: 5 }
  ], thickness: 0.2 }) as SlabNode;

  // Add a furniture item
  const table = createNode("item", { name: "Table", parentId: levelId, itemType: "furniture", dimensions: { x: 1.2, y: 0.75, z: 0.8 }, transform: { position: { x: 3, y: 0, z: 2.5 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } } }) as ItemNode;

  // Wire up level children
  const level = { ...nodes[levelId], childIds: [w1.id, w2.id, w3.id, w4.id, door.id, win.id, slab.id, table.id] };

  return {
    nodes: {
      ...nodes,
      [levelId]: level as any,
      [w1.id]: w1, [w2.id]: w2, [w3.id]: w3, [w4.id]: w4,
      [door.id]: door, [win.id]: win, [slab.id]: slab, [table.id]: table,
    },
    rootNodeIds: scene.rootNodeIds,
  };
}

export function DevTest() {
  const loadScene = useScene((s) => s.loadScene);

  useEffect(() => {
    const scene = buildTestScene();
    loadScene(scene);
  }, [loadScene]);

  return (
    <div className="w-screen h-screen bg-[#0A0A0A]">
      <FloorplanCanvas className="w-full h-full" />
    </div>
  );
}
