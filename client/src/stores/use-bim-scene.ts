import { create } from "zustand";
import { temporal } from "zundo";
import type { CatalogItem } from "@/lib/pascal/furniture-catalog";
import type {
  CanonicalBim,
  Door,
  DoorFamily,
  Fixture,
  Furniture,
  Level,
  Vec2,
  Vec3,
  Wall,
  Window as BimWindow,
  WindowFamily,
} from "@shared/bim/canonical-schema";
import { createEmptyCanonicalBim, wallSchema } from "@shared/bim/canonical-schema";
import { loadCanonicalBim } from "@shared/bim/load";
import { pascalSceneDataToCanonicalBim } from "@shared/pascal-to-bim";
import type { SceneData } from "@shared/pascal-scene";

function newId(): string {
  return crypto.randomUUID();
}

function snap(v: number): number {
  return Math.round(v * 20) / 20;
}

export interface BimSceneState {
  bim: CanonicalBim;
  floorplanId: number | null;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  lastSavedAt: number | null;

  loadFromCanonicalJson: (json: string, floorplanId?: number) => void;
  loadFromPascalScene: (scene: SceneData, floorplanId?: number) => void;
  reset: () => void;
  setFloorplanId: (id: number | null) => void;

  getCanonicalJson: () => string;

  setBim: (next: CanonicalBim) => void;

  addWall: (opts: {
    levelId: string;
    start: Vec2;
    end: Vec2;
    height?: number;
    thickness?: number;
    isExterior?: boolean;
  }) => string;

  updateWall: (id: string, patch: Partial<Pick<Wall, "start" | "end" | "height" | "thickness" | "isExterior">>) => void;

  addDoor: (opts: {
    levelId: string;
    hostWallId: string;
    position: number;
    width?: number;
    height?: number;
    family?: DoorFamily;
  }) => string;

  addWindow: (opts: {
    levelId: string;
    hostWallId: string;
    position: number;
    width?: number;
    height?: number;
    sillHeight?: number;
    family?: WindowFamily;
  }) => string;

  addFurnitureFromCatalog: (opts: {
    levelId: string;
    catalogItem: CatalogItem;
    position: Vec3;
    rotationY?: number;
  }) => string;

  updatePlacedAsset: (
    id: string,
    patch: Partial<{ position: Vec3; rotationY: number }>,
    kind: "furniture" | "fixture",
  ) => void;

  deleteById: (id: string) => void;

  addLevel: (opts?: { name?: string }) => string;

  setSaving: (saving: boolean) => void;
  markSaved: () => void;
}

const emptyBim = (): CanonicalBim => createEmptyCanonicalBim();

export const useBimScene = create<BimSceneState>()(
  temporal(
    (set, get) => ({
      bim: emptyBim(),
      floorplanId: null,
      hasUnsavedChanges: false,
      isSaving: false,
      lastSavedAt: null,

      loadFromCanonicalJson: (json: string, floorplanId?: number) => {
        const r = loadCanonicalBim(json);
        if (r.status === "error" || !r.bim) {
          console.warn("[useBimScene] Invalid canonical JSON, using empty BIM", r.diagnostics);
          set({
            bim: emptyBim(),
            floorplanId: floorplanId ?? null,
            hasUnsavedChanges: false,
          });
          return;
        }
        set({
          bim: r.bim,
          floorplanId: floorplanId ?? null,
          hasUnsavedChanges: false,
        });
      },

      loadFromPascalScene: (scene: SceneData, floorplanId?: number) => {
        const bim = pascalSceneDataToCanonicalBim(scene);
        set({
          bim,
          floorplanId: floorplanId ?? null,
          hasUnsavedChanges: false,
        });
      },

      reset: () => {
        set({
          bim: emptyBim(),
          floorplanId: null,
          hasUnsavedChanges: false,
          isSaving: false,
          lastSavedAt: null,
        });
      },

      setFloorplanId: (id: number | null) => set({ floorplanId: id }),

      getCanonicalJson: () => JSON.stringify(get().bim),

      setBim: (next: CanonicalBim) =>
        set({
          bim: next,
          hasUnsavedChanges: true,
        }),

      addWall: (opts: {
        levelId: string;
        start: Vec2;
        end: Vec2;
        height?: number;
        thickness?: number;
        isExterior?: boolean;
      }) => {
        const id = newId();
        const wall: Wall = wallSchema.parse({
          id,
          kind: "wall",
          start: opts.start,
          end: opts.end,
          height: opts.height ?? 2.7,
          thickness: opts.thickness ?? 0.15,
          isExterior: opts.isExterior ?? false,
          isLoadBearing: false,
          levelId: opts.levelId,
          tags: [],
        });
        set((s: BimSceneState) => ({
          bim: { ...s.bim, walls: [...s.bim.walls, wall] },
          hasUnsavedChanges: true,
        }));
        return id;
      },

      updateWall: (id: string, patch: Partial<Pick<Wall, "start" | "end" | "height" | "thickness" | "isExterior">>) => {
        set((s: BimSceneState) => ({
          bim: {
            ...s.bim,
            walls: s.bim.walls.map((w: Wall) =>
              w.id === id
                ? {
                    ...w,
                    ...patch,
                    start: patch.start ? { x: snap(patch.start.x), z: snap(patch.start.z) } : w.start,
                    end: patch.end ? { x: snap(patch.end.x), z: snap(patch.end.z) } : w.end,
                  }
                : w,
            ),
          },
          hasUnsavedChanges: true,
        }));
      },

      addDoor: (opts: {
        levelId: string;
        hostWallId: string;
        position: number;
        width?: number;
        height?: number;
        family?: DoorFamily;
      }) => {
        const id = newId();
        const door: Door = {
          id,
          kind: "door",
          hostWallId: opts.hostWallId,
          position: opts.position,
          width: opts.width ?? 0.9,
          height: opts.height ?? 2.1,
          family: opts.family ?? "single",
          swing: "left",
          levelId: opts.levelId,
          tags: [],
        };
        set((s: BimSceneState) => ({
          bim: { ...s.bim, doors: [...s.bim.doors, door] },
          hasUnsavedChanges: true,
        }));
        return id;
      },

      addWindow: (opts: {
        levelId: string;
        hostWallId: string;
        position: number;
        width?: number;
        height?: number;
        sillHeight?: number;
        family?: WindowFamily;
      }) => {
        const id = newId();
        const win: BimWindow = {
          id,
          kind: "window",
          hostWallId: opts.hostWallId,
          position: opts.position,
          width: opts.width ?? 1.2,
          height: opts.height ?? 1.2,
          sillHeight: opts.sillHeight ?? 0.9,
          family: opts.family ?? "casement",
          levelId: opts.levelId,
          tags: [],
        };
        set((s: BimSceneState) => ({
          bim: { ...s.bim, windows: [...s.bim.windows, win] },
          hasUnsavedChanges: true,
        }));
        return id;
      },

      addFurnitureFromCatalog: (opts: {
        levelId: string;
        catalogItem: CatalogItem;
        position: Vec3;
        rotationY?: number;
      }) => {
        const id = newId();
        const { catalogItem, position, levelId, rotationY = 0 } = opts;
        const item: Furniture = {
          id,
          kind: "furniture",
          category: "other",
          position,
          rotationY,
          levelId,
          tags: [],
          asset: {
            catalogId: catalogItem.id,
            glbUrl: catalogItem.modelUrl,
            dimensions: catalogItem.dimensions ?? { x: 1, y: 1, z: 1 },
            keywords: catalogItem.keywords ?? [],
            materialSlots: [],
          },
        };
        set((s: BimSceneState) => ({
          bim: { ...s.bim, furniture: [...s.bim.furniture, item] },
          hasUnsavedChanges: true,
        }));
        return id;
      },

      updatePlacedAsset: (
        id: string,
        patch: Partial<{ position: Vec3; rotationY: number }>,
        kind: "furniture" | "fixture",
      ) => {
        set((s: BimSceneState) => {
          if (kind === "furniture") {
            return {
              bim: {
                ...s.bim,
                furniture: s.bim.furniture.map((f: Furniture) =>
                  f.id === id
                    ? {
                        ...f,
                        position: patch.position ?? f.position,
                        rotationY: patch.rotationY ?? f.rotationY,
                      }
                    : f,
                ),
              },
              hasUnsavedChanges: true,
            };
          }
          return {
            bim: {
              ...s.bim,
              fixtures: s.bim.fixtures.map((f: Fixture) =>
                f.id === id
                  ? {
                      ...f,
                      position: patch.position ?? f.position,
                      rotationY: patch.rotationY ?? f.rotationY,
                    }
                  : f,
              ),
            },
            hasUnsavedChanges: true,
          };
        });
      },

      deleteById: (id: string) => {
        set((s: BimSceneState) => {
          const bim = s.bim;
          const doors = bim.doors.filter((d: Door) => d.id !== id && d.hostWallId !== id);
          const windows = bim.windows.filter((w: BimWindow) => w.id !== id && w.hostWallId !== id);
          return {
            bim: {
              ...bim,
              levels: bim.levels.filter((l: Level) => l.id !== id),
              walls: bim.walls.filter((w: Wall) => w.id !== id),
              doors,
              windows,
              slabs: bim.slabs.filter((x) => x.id !== id),
              ceilings: bim.ceilings.filter((x) => x.id !== id),
              roofs: bim.roofs.filter((x) => x.id !== id),
              rooms: bim.rooms.filter((x) => x.id !== id),
              stairs: bim.stairs.filter((x) => x.id !== id),
              columns: bim.columns.filter((x) => x.id !== id),
              furniture: bim.furniture.filter((x) => x.id !== id),
              fixtures: bim.fixtures.filter((x) => x.id !== id),
            },
            hasUnsavedChanges: true,
          };
        });
      },

      addLevel: (opts?: { name?: string }) => {
        const id = newId();
        set((s: BimSceneState) => {
          const nextIndex =
            s.bim.levels.length === 0
              ? 0
              : Math.max(...s.bim.levels.map((l: Level) => l.index)) + 1;
          const nextElevation =
            s.bim.levels.length === 0
              ? 0
              : Math.max(
                  ...s.bim.levels.map((l: Level) => l.elevation + l.height),
                );
          const lvl: Level = {
            id,
            name: opts?.name ?? (nextIndex === 0 ? "Ground Floor" : `Floor ${nextIndex}`),
            index: nextIndex,
            elevation: nextElevation,
            height: 2.7,
            tags: [],
          };
          return {
            bim: { ...s.bim, levels: [...s.bim.levels, lvl] },
            hasUnsavedChanges: true,
          };
        });
        return id;
      },

      setSaving: (isSaving: boolean) => set({ isSaving }),
      markSaved: () =>
        set({
          lastSavedAt: Date.now(),
          hasUnsavedChanges: false,
          isSaving: false,
        }),
    }),
    {
      limit: 50,
      equality: (past: BimSceneState, curr: BimSceneState) => past.bim === curr.bim,
    },
  ),
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useBimSceneHistory = (useBimScene as any).temporal;
