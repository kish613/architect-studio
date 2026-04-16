import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useBimScene } from "@/stores/use-bim-scene";
import { useViewer } from "@/stores/use-viewer";
import { sceneRegistry } from "@/lib/pascal/scene-registry";
import { onTextureReady } from "@/lib/bim/texture-service";
import type { CanonicalBim, Wall } from "@shared/bim/canonical-schema";
import { getLevelElevationM } from "./bim-level-utils";
import { createBimWallGeometry, getBimWallLength, getBimWallMaterial, getBimWallTransform } from "./systems/bim-wall-system";
import { createBimSlabGeometry, getBimSlabMaterial } from "./systems/bim-slab-system";
import { createBimCeilingGeometry, getBimCeilingMaterial } from "./systems/bim-ceiling-system";
import { createBimDoorGeometries, getBimDoorMaterials, getBimDoorPositionOnWall } from "./systems/bim-door-system";
import { createBimWindowGeometries, getBimWindowMaterials, getBimWindowPositionOnWall } from "./systems/bim-window-system";
import { createBimRoofGeometry, getBimRoofMaterial } from "./systems/bim-roof-system";
import { getBimStairMaterial, getBimStairSteps } from "./systems/bim-stair-system";
import { createBimColumnGeometry, getBimColumnMaterial, getBimColumnTransform } from "./systems/bim-column-system";
import { createBimRoomFloorGeometry, getBimRoomFloorMaterial } from "./systems/bim-room-system";
import { BimFurnitureMesh } from "./BimFurnitureMesh";
import { BimWallDragHandles } from "./BimWallDragHandles";
import { BimItemDragHandles } from "./BimItemDragHandles";

export type BimLayerToggles = {
  walls: boolean;
  rooms: boolean;
  openings: boolean;
  furniture: boolean;
  slabs: boolean;
  ceilings: boolean;
  roofs: boolean;
  stairs: boolean;
  columns: boolean;
};

const DEFAULT_LAYERS: BimLayerToggles = {
  walls: true,
  rooms: true,
  openings: true,
  furniture: true,
  slabs: true,
  ceilings: true,
  roofs: true,
  stairs: true,
  columns: true,
};

function levelYOffset(
  bim: CanonicalBim,
  levelId: string | undefined,
  levelMode: string,
  explodedSpacing: number,
): number {
  const elev = getLevelElevationM(bim, levelId ?? null);
  if (levelMode !== "exploded") return elev;
  const lvl = bim.levels.find((l) => l.id === levelId) ?? bim.levels[0];
  const idx = lvl?.index ?? 0;
  return elev + idx * explodedSpacing;
}

function filterByLevel<T extends { levelId?: string }>(
  items: T[],
  activeLevelId: string | null | undefined,
  soloLevelId: string | null,
): T[] {
  if (soloLevelId) {
    return items.filter((x) => x.levelId === soloLevelId);
  }
  if (activeLevelId) {
    return items.filter((x) => !x.levelId || x.levelId === activeLevelId);
  }
  return items;
}

function BimStairGroup({
  stair,
  bim,
  yBase,
  isSelected,
}: {
  stair: CanonicalBim["stairs"][number];
  bim: CanonicalBim;
  yBase: number;
  isSelected: boolean;
}) {
  const steps = useMemo(() => getBimStairSteps(stair, yBase), [stair, yBase]);
  const mat = useMemo(() => getBimStairMaterial(bim, stair, isSelected), [bim, stair, isSelected]);

  useEffect(() => () => mat.dispose(), [mat]);

  return (
    <group
      ref={(g) => {
        if (g) sceneRegistry.register(stair.id, g);
        else sceneRegistry.unregister(stair.id);
      }}
      userData={{ nodeId: stair.id }}
    >
      {steps.map((step, i) => (
        <mesh
          key={`${stair.id}-${i}`}
          position={step.position}
          rotation={[0, step.rotationY, 0]}
          material={mat}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[step.width, step.rise, step.treadDepth]} />
        </mesh>
      ))}
    </group>
  );
}

function BimRoomFloor({
  room,
  bim,
  levelMode,
  explodedSpacing,
}: {
  room: CanonicalBim["rooms"][number];
  bim: CanonicalBim;
  levelMode: string;
  explodedSpacing: number;
}) {
  const geometry = useMemo(() => createBimRoomFloorGeometry(room), [room]);
  const material = useMemo(() => getBimRoomFloorMaterial(room), [room]);
  const yOff = levelYOffset(bim, room.levelId, levelMode, explodedSpacing);

  useEffect(() => {
    return () => {
      geometry?.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  if (!geometry) return null;

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[0, yOff + 0.02, 0]}
      receiveShadow
      ref={(mesh) => {
        if (mesh) sceneRegistry.register(room.id, mesh);
        else sceneRegistry.unregister(room.id);
      }}
      userData={{ nodeId: room.id }}
    />
  );
}

function BimWallMesh({
  wall,
  bim,
  yOffset,
}: {
  wall: Wall;
  bim: CanonicalBim;
  yOffset: number;
}) {
  const selectedIds = useViewer((s) => s.selectedIds);
  const hoveredId = useViewer((s) => s.hoveredId);
  const isSelected = selectedIds.includes(wall.id);
  const isHovered = hoveredId === wall.id;
  const { position, rotationY } = getBimWallTransform(wall, yOffset);
  const geometry = useMemo(() => createBimWallGeometry(wall), [wall]);
  const material = useMemo(
    () => getBimWallMaterial(bim, wall, isSelected, isHovered, getBimWallLength(wall)),
    [bim, wall, isSelected, isHovered],
  );

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
        if (mesh) sceneRegistry.register(wall.id, mesh);
        else sceneRegistry.unregister(wall.id);
      }}
      userData={{ nodeId: wall.id }}
    />
  );
}

export interface BimSceneRendererProps {
  layers?: Partial<BimLayerToggles>;
  /** If set, only show this level's elements (+ unassigned) */
  activeLevelId?: string | null;
}

export function BimSceneRenderer({ layers: layersProp, activeLevelId: activeLevelIdProp }: BimSceneRendererProps) {
  useEffect(() => () => sceneRegistry.clear(), []);

  const bim = useBimScene((s) => s.bim);
  const selectedIds = useViewer((s) => s.selectedIds);
  const levelMode = useViewer((s) => s.levelMode);
  const explodedSpacing = useViewer((s) => s.explodedSpacing);
  const soloLevelId = useViewer((s) => s.soloLevelId);
  const storeLevelId = useViewer((s) => s.activeLevelId);

  const activeLevelId = activeLevelIdProp !== undefined ? activeLevelIdProp : storeLevelId;
  const layers = { ...DEFAULT_LAYERS, ...layersProp };

  // Texture progressive loading: increment counter when any texture finishes
  // loading, which triggers React re-render and picks up the new textures.
  const [, setTextureGen] = useState(0);
  useEffect(() => {
    const unsub = onTextureReady(() => {
      setTextureGen((g) => g + 1);
    });
    return unsub;
  }, []);

  const walls = useMemo(
    () => filterByLevel(bim.walls, activeLevelId, soloLevelId),
    [bim.walls, activeLevelId, soloLevelId],
  );
  const wallMap = useMemo(() => Object.fromEntries(walls.map((w) => [w.id, w])) as Record<string, Wall>, [walls]);

  const doors = useMemo(() => {
    const d = filterByLevel(bim.doors, activeLevelId, soloLevelId);
    return layers.openings ? d : [];
  }, [bim.doors, activeLevelId, soloLevelId, layers.openings]);

  const windows = useMemo(() => {
    const w = filterByLevel(bim.windows, activeLevelId, soloLevelId);
    return layers.openings ? w : [];
  }, [bim.windows, activeLevelId, soloLevelId, layers.openings]);

  const slabs = useMemo(() => {
    const s = filterByLevel(bim.slabs, activeLevelId, soloLevelId);
    return layers.slabs ? s : [];
  }, [bim.slabs, activeLevelId, soloLevelId, layers.slabs]);

  const ceilings = useMemo(() => {
    const c = filterByLevel(bim.ceilings, activeLevelId, soloLevelId);
    return layers.ceilings ? c : [];
  }, [bim.ceilings, activeLevelId, soloLevelId, layers.ceilings]);

  const roofs = useMemo(() => {
    const r = filterByLevel(bim.roofs, activeLevelId, soloLevelId);
    return layers.roofs ? r : [];
  }, [bim.roofs, activeLevelId, soloLevelId, layers.roofs]);

  const rooms = useMemo(() => {
    const r = filterByLevel(bim.rooms, activeLevelId, soloLevelId);
    return layers.rooms ? r : [];
  }, [bim.rooms, activeLevelId, soloLevelId, layers.rooms]);

  const stairs = useMemo(() => {
    const st = filterByLevel(bim.stairs, activeLevelId, soloLevelId);
    return layers.stairs ? st : [];
  }, [bim.stairs, activeLevelId, soloLevelId, layers.stairs]);

  const columns = useMemo(() => {
    const c = filterByLevel(bim.columns, activeLevelId, soloLevelId);
    return layers.columns ? c : [];
  }, [bim.columns, activeLevelId, soloLevelId, layers.columns]);

  const furniture = useMemo(() => {
    const f = filterByLevel(bim.furniture, activeLevelId, soloLevelId);
    return layers.furniture ? f : [];
  }, [bim.furniture, activeLevelId, soloLevelId, layers.furniture]);

  const fixtures = useMemo(() => {
    const f = filterByLevel(bim.fixtures, activeLevelId, soloLevelId);
    return layers.furniture ? f : [];
  }, [bim.fixtures, activeLevelId, soloLevelId, layers.furniture]);

  const showWalls = layers.walls;

  return (
    <group>
      {rooms.map((room) => (
        <BimRoomFloor key={room.id} room={room} bim={bim} levelMode={levelMode} explodedSpacing={explodedSpacing} />
      ))}

      {showWalls &&
        walls.map((w) => {
          const yOff = levelYOffset(bim, w.levelId, levelMode, explodedSpacing);
          return <BimWallMesh key={w.id} wall={w} bim={bim} yOffset={yOff} />;
        })}

      {showWalls &&
        doors.map((d) => {
          const wall = wallMap[d.hostWallId];
          if (!wall) return null;
          const yOff = levelYOffset(bim, wall.levelId ?? d.levelId, levelMode, explodedSpacing);
          const position = getBimDoorPositionOnWall(d, wall, yOff);
          const { frame, panel } = createBimDoorGeometries(d);
          const materials = getBimDoorMaterials(selectedIds.includes(d.id));
          const dx = wall.end.x - wall.start.x;
          const dz = wall.end.z - wall.start.z;
          const rotationY = -Math.atan2(dz, dx);
          return (
            <group
              key={d.id}
              position={position}
              rotation={[0, rotationY, 0]}
              ref={(g) => {
                if (g) sceneRegistry.register(d.id, g);
                else sceneRegistry.unregister(d.id);
              }}
              userData={{ nodeId: d.id }}
            >
              <mesh geometry={frame} material={materials.frame} castShadow />
              <mesh geometry={panel} material={materials.panel} castShadow />
            </group>
          );
        })}

      {windows.map((win) => {
        const wall = wallMap[win.hostWallId];
        if (!wall) return null;
        const yOff = levelYOffset(bim, wall.levelId ?? win.levelId, levelMode, explodedSpacing);
        const position = getBimWindowPositionOnWall(win, wall, yOff);
        const { frame, glass } = createBimWindowGeometries(win);
        const materials = getBimWindowMaterials(selectedIds.includes(win.id));
        const dx = wall.end.x - wall.start.x;
        const dz = wall.end.z - wall.start.z;
        const rotationY = -Math.atan2(dz, dx);
        return (
          <group
            key={win.id}
            position={position}
            rotation={[0, rotationY, 0]}
            ref={(g) => {
              if (g) sceneRegistry.register(win.id, g);
              else sceneRegistry.unregister(win.id);
            }}
            userData={{ nodeId: win.id }}
          >
            <mesh geometry={frame} material={materials.frame} castShadow />
            <mesh geometry={glass} material={materials.glass} />
          </group>
        );
      })}

      {slabs.map((slab) => {
        const geo = createBimSlabGeometry(slab);
        if (!geo) return null;
        const yOff = levelYOffset(bim, slab.levelId, levelMode, explodedSpacing);
        const mat = getBimSlabMaterial(bim, slab, selectedIds.includes(slab.id));
        return (
          <mesh
            key={slab.id}
            geometry={geo}
            material={mat}
            position={[0, yOff, 0]}
            receiveShadow
            ref={(mesh) => {
              if (mesh) sceneRegistry.register(slab.id, mesh);
              else sceneRegistry.unregister(slab.id);
            }}
            userData={{ nodeId: slab.id }}
          />
        );
      })}

      {ceilings.map((ceil) => {
        const geo = createBimCeilingGeometry(ceil);
        if (!geo) return null;
        const lvl = bim.levels.find((l) => l.id === ceil.levelId) ?? bim.levels[0];
        const base = levelYOffset(bim, ceil.levelId, levelMode, explodedSpacing);
        const top = base + (lvl?.height ?? 2.7);
        const mat = getBimCeilingMaterial(bim, ceil, selectedIds.includes(ceil.id));
        return (
          <mesh
            key={ceil.id}
            geometry={geo}
            material={mat}
            position={[0, top - ceil.thickness, 0]}
            receiveShadow
            ref={(mesh) => {
              if (mesh) sceneRegistry.register(ceil.id, mesh);
              else sceneRegistry.unregister(ceil.id);
            }}
            userData={{ nodeId: ceil.id }}
          />
        );
      })}

      {roofs.map((roof) => {
        const geo = createBimRoofGeometry(roof);
        const yOff = levelYOffset(bim, roof.levelId, levelMode, explodedSpacing);
        const lvl = bim.levels.find((l) => l.id === roof.levelId) ?? bim.levels[0];
        const top = yOff + (lvl?.height ?? 2.7);
        const mat = getBimRoofMaterial(bim, roof, selectedIds.includes(roof.id));
        return (
          <mesh
            key={roof.id}
            geometry={geo}
            material={mat}
            position={[0, top, 0]}
            castShadow
            ref={(mesh) => {
              if (mesh) sceneRegistry.register(roof.id, mesh);
              else sceneRegistry.unregister(roof.id);
            }}
            userData={{ nodeId: roof.id }}
          />
        );
      })}

      {stairs.map((st) => (
        <BimStairGroup
          key={st.id}
          stair={st}
          bim={bim}
          yBase={levelYOffset(bim, st.levelId, levelMode, explodedSpacing)}
          isSelected={selectedIds.includes(st.id)}
        />
      ))}

      {columns.map((col) => {
        const geo = createBimColumnGeometry(col);
        const { position } = getBimColumnTransform(col, levelYOffset(bim, col.levelId, levelMode, explodedSpacing));
        const mat = getBimColumnMaterial(bim, col, selectedIds.includes(col.id));
        return (
          <mesh
            key={col.id}
            geometry={geo}
            material={mat}
            position={position}
            castShadow
            receiveShadow
            ref={(mesh) => {
              if (mesh) sceneRegistry.register(col.id, mesh);
              else sceneRegistry.unregister(col.id);
            }}
            userData={{ nodeId: col.id }}
          />
        );
      })}

      {furniture.map((f) => (
        <BimFurnitureMesh
          key={f.id}
          asset={f}
          levelElevation={levelYOffset(bim, f.levelId, levelMode, explodedSpacing)}
          isSelected={selectedIds.includes(f.id)}
        />
      ))}

      {fixtures.map((f) => (
        <BimFurnitureMesh
          key={f.id}
          asset={f}
          levelElevation={levelYOffset(bim, f.levelId, levelMode, explodedSpacing)}
          isSelected={selectedIds.includes(f.id)}
        />
      ))}

      {showWalls &&
        walls
          .filter((w) => selectedIds.includes(w.id))
          .map((w) => {
            const yOff = levelYOffset(bim, w.levelId, levelMode, explodedSpacing);
            return <BimWallDragHandles key={`h-${w.id}`} wall={w} levelElevation={yOff} />;
          })}

      {furniture
        .filter((f) => selectedIds.includes(f.id))
        .map((f) => (
          <BimItemDragHandles key={`ih-${f.id}`} asset={f} kind="furniture" levelElevation={levelYOffset(bim, f.levelId, levelMode, explodedSpacing)} />
        ))}

      {fixtures
        .filter((f) => selectedIds.includes(f.id))
        .map((f) => (
          <BimItemDragHandles key={`ih-${f.id}`} asset={f} kind="fixture" levelElevation={levelYOffset(bim, f.levelId, levelMode, explodedSpacing)} />
        ))}
    </group>
  );
}
