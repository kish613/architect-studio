import type { AnyNode, NodeType } from "./schemas";

type EventMap = {
  "node:created": { node: AnyNode };
  "node:updated": { nodeId: string; changes: Partial<AnyNode> };
  "node:deleted": { nodeId: string; type: NodeType };
  "selection:changed": { nodeIds: string[] };
  "tool:changed": { tool: string };
  "scene:loaded": { nodeCount: number };
  "scene:saved": { timestamp: number };
  "scene:dirty": { dirtyNodeIds: string[] };
};

type EventHandler<T> = (data: T) => void;

class EventBus {
  private handlers = new Map<string, Set<EventHandler<any>>>();

  on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    this.handlers.get(event)?.forEach((handler) => {
      try {
        handler(data);
      } catch (err) {
        console.error(`Event handler error [${event}]:`, err);
      }
    });
  }

  off<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void {
    this.handlers.get(event)?.delete(handler);
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const eventBus = new EventBus();
export type { EventMap };
