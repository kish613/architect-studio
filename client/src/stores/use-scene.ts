import { create } from "zustand";
import { temporal } from "zundo";
import type { AnyNode, SceneData } from "@/lib/pascal/schemas";
import { createEmptyScene } from "@/lib/pascal/schemas";
import { eventBus } from "@/lib/pascal/event-bus";
import { useViewer } from "@/stores/use-viewer";
import { deriveSceneContext } from "@/lib/pascal/scene-context";

interface SceneState {
  // Scene data (persisted)
  nodes: Record<string, AnyNode>;
  rootNodeIds: string[];

  // Tracking
  dirtyNodeIds: Set<string>;
  floorplanId: number | null;
  lastSavedAt: number | null;
  isSaving: boolean;
  hasUnsavedChanges: boolean;

  // Node CRUD
  addNode: (node: AnyNode, parentId?: string) => void;
  updateNode: (nodeId: string, changes: Partial<AnyNode>) => void;
  deleteNode: (nodeId: string) => void;
  moveNode: (nodeId: string, newParentId: string) => void;

  // Bulk operations
  loadScene: (data: SceneData, floorplanId?: number) => void;
  clearScene: () => void;
  getSceneData: () => SceneData;

  // Dirty tracking
  markDirty: (nodeId: string) => void;
  clearDirty: () => void;

  // Persistence helpers
  setFloorplanId: (id: number) => void;
  setSaving: (saving: boolean) => void;
  markSaved: () => void;
}

export const useScene = create<SceneState>()(
  temporal(
    (set, get) => {
      const emptyScene = createEmptyScene();

      return {
        nodes: emptyScene.nodes,
        rootNodeIds: emptyScene.rootNodeIds,
        dirtyNodeIds: new Set<string>(),
        floorplanId: null,
        lastSavedAt: null,
        isSaving: false,
        hasUnsavedChanges: false,

        addNode: (node, parentId) => {
          set((state) => {
            const nodes = { ...state.nodes, [node.id]: node };

            if (parentId && nodes[parentId]) {
              const parent = { ...nodes[parentId] };
              parent.childIds = [...parent.childIds, node.id];
              nodes[parentId] = parent as AnyNode;
              // Note: node.parentId is set by caller
            }

            const rootNodeIds = parentId
              ? state.rootNodeIds
              : [...state.rootNodeIds, node.id];

            eventBus.emit("node:created", { node });

            const dirtyNodeIds = new Set(state.dirtyNodeIds);
            dirtyNodeIds.add(node.id);

            return {
              nodes,
              rootNodeIds,
              dirtyNodeIds,
              hasUnsavedChanges: true,
            };
          });
        },

        updateNode: (nodeId, changes) => {
          set((state) => {
            const existing = state.nodes[nodeId];
            if (!existing) return state;

            const updated = { ...existing, ...changes, type: existing.type } as AnyNode;
            eventBus.emit("node:updated", { nodeId, changes });

            const dirtyNodeIds = new Set(state.dirtyNodeIds);
            dirtyNodeIds.add(nodeId);

            return {
              nodes: { ...state.nodes, [nodeId]: updated },
              dirtyNodeIds,
              hasUnsavedChanges: true,
            };
          });
        },

        deleteNode: (nodeId) => {
          set((state) => {
            const node = state.nodes[nodeId];
            if (!node) return state;

            // Collect all descendant IDs
            const toDelete = new Set<string>();
            const queue = [nodeId];
            while (queue.length > 0) {
              const id = queue.shift()!;
              toDelete.add(id);
              const n = state.nodes[id];
              if (n) queue.push(...n.childIds);
            }

            const nodes = { ...state.nodes };

            // Remove from parent
            if (node.parentId && nodes[node.parentId]) {
              const parent = { ...nodes[node.parentId] };
              parent.childIds = parent.childIds.filter((id) => id !== nodeId);
              nodes[node.parentId] = parent as AnyNode;
            }

            for (const id of toDelete) {
              delete nodes[id];
            }

            const rootNodeIds = state.rootNodeIds.filter((id) => !toDelete.has(id));
            eventBus.emit("node:deleted", { nodeId, type: node.type });

            const dirtyNodeIds = new Set(state.dirtyNodeIds);
            for (const id of toDelete) {
              dirtyNodeIds.add(id);
            }

            return {
              nodes,
              rootNodeIds,
              dirtyNodeIds,
              hasUnsavedChanges: true,
            };
          });
        },

        moveNode: (nodeId, newParentId) => {
          set((state) => {
            const node = state.nodes[nodeId];
            const newParent = state.nodes[newParentId];
            if (!node || !newParent) return state;

            const nodes = { ...state.nodes };

            if (node.parentId && nodes[node.parentId]) {
              const oldParent = { ...nodes[node.parentId] };
              oldParent.childIds = oldParent.childIds.filter((id) => id !== nodeId);
              nodes[node.parentId] = oldParent as AnyNode;
            }

            const updatedParent = { ...newParent };
            updatedParent.childIds = [...updatedParent.childIds, nodeId];
            nodes[newParentId] = updatedParent as AnyNode;

            const updatedNode = { ...node, parentId: newParentId };
            nodes[nodeId] = updatedNode as AnyNode;

            const dirtyNodeIds = new Set(state.dirtyNodeIds);
            dirtyNodeIds.add(nodeId);
            dirtyNodeIds.add(newParentId);

            return {
              nodes,
              rootNodeIds: state.rootNodeIds.filter((id) => id !== nodeId),
              dirtyNodeIds,
              hasUnsavedChanges: true,
            };
          });
        },

        loadScene: (data, floorplanId) => {
          const context = deriveSceneContext(data);
          set({
            nodes: data.nodes,
            rootNodeIds: data.rootNodeIds,
            dirtyNodeIds: new Set(),
            floorplanId: floorplanId ?? null,
            hasUnsavedChanges: false,
          });
          useViewer.getState().setActiveBuilding(context.activeBuildingId);
          useViewer.getState().setActiveLevel(context.activeLevelId);
          eventBus.emit("scene:loaded", { nodeCount: Object.keys(data.nodes).length });
        },

        clearScene: () => {
          const emptyScene = createEmptyScene();
          set({
            nodes: emptyScene.nodes,
            rootNodeIds: emptyScene.rootNodeIds,
            dirtyNodeIds: new Set(),
            hasUnsavedChanges: true,
          });
          useViewer.getState().setActiveBuilding(null);
          useViewer.getState().setActiveLevel(null);
        },

        getSceneData: () => ({
          nodes: get().nodes,
          rootNodeIds: get().rootNodeIds,
        }),

        markDirty: (nodeId) => {
          set((state) => {
            const dirtyNodeIds = new Set(state.dirtyNodeIds);
            dirtyNodeIds.add(nodeId);
            return {
              dirtyNodeIds,
              hasUnsavedChanges: true,
            };
          });
        },

        clearDirty: () => {
          set({ dirtyNodeIds: new Set() });
        },

        setFloorplanId: (id) => set({ floorplanId: id }),
        setSaving: (saving) => set({ isSaving: saving }),
        markSaved: () => set({ lastSavedAt: Date.now(), hasUnsavedChanges: false, isSaving: false }),
      };
    },
    {
      limit: 50,
      equality: (pastState, currentState) =>
        pastState.nodes === currentState.nodes,
    }
  )
);

export const useSceneHistory = (useScene as any).temporal;
