import { create } from "zustand";
import type { AnyNode, AnyNodeId } from "./types";

interface PascalSceneState {
  nodes: Record<AnyNodeId, AnyNode>;
  rootIds: AnyNodeId[];

  setScene: (nodes: Record<AnyNodeId, AnyNode>, rootIds: AnyNodeId[]) => void;
  createNode: (node: AnyNode, parentId?: AnyNodeId) => void;
  updateNode: (id: AnyNodeId, data: Partial<AnyNode>) => void;
  updateNodes: (updates: Array<{ id: AnyNodeId; data: Partial<AnyNode> }>) => void;
  deleteNode: (id: AnyNodeId) => void;
}

export const useScene = create<PascalSceneState>((set) => ({
  nodes: {} as Record<AnyNodeId, AnyNode>,
  rootIds: [] as AnyNodeId[],

  setScene: (nodes, rootIds) => set({ nodes, rootIds }),

  createNode: (node, parentId) =>
    set((state) => {
      const nodes = { ...state.nodes, [node.id]: node };

      if (parentId && nodes[parentId]) {
        const parent = { ...nodes[parentId] } as any;
        if (Array.isArray(parent.children)) {
          parent.children = [...parent.children, node.id];
        }
        nodes[parentId] = parent;
      }

      const rootIds =
        parentId ? state.rootIds : [...state.rootIds, node.id as AnyNodeId];
      return { nodes, rootIds };
    }),

  updateNode: (id, data) =>
    set((state) => {
      const existing = state.nodes[id];
      if (!existing) return state;
      return {
        nodes: {
          ...state.nodes,
          [id]: { ...existing, ...data, type: existing.type } as AnyNode,
        },
      };
    }),

  updateNodes: (updates) =>
    set((state) => {
      const nodes = { ...state.nodes };
      let changed = false;
      for (const { id, data } of updates) {
        const existing = nodes[id];
        if (!existing) continue;
        nodes[id] = { ...existing, ...data, type: existing.type } as AnyNode;
        changed = true;
      }
      return changed ? { nodes } : state;
    }),

  deleteNode: (id) =>
    set((state) => {
      const node = state.nodes[id];
      if (!node) return state;

      const nodes = { ...state.nodes };
      delete nodes[id];

      // Remove from parent's children
      if (node.parentId && nodes[node.parentId as AnyNodeId]) {
        const parent = { ...nodes[node.parentId as AnyNodeId] } as any;
        if (Array.isArray(parent.children)) {
          parent.children = parent.children.filter((c: string) => c !== id);
        }
        nodes[node.parentId as AnyNodeId] = parent;
      }

      const rootIds = state.rootIds.filter((rid) => rid !== id);
      return { nodes, rootIds };
    }),
}));
