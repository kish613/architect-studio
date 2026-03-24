import { describe, expect, it } from "vitest";
import {
  CURRENT_SCENE_SCHEMA_VERSION,
  loadPascalScene,
} from "@shared/pascal-load";

describe("loadPascalScene", () => {
  it("accepts already-valid canonical scene payloads", () => {
    const result = loadPascalScene({
      schemaVersion: CURRENT_SCENE_SCHEMA_VERSION,
      nodes: {
        "11111111-1111-4111-8111-111111111111": {
          id: "11111111-1111-4111-8111-111111111111",
          type: "site",
          parentId: null,
          childIds: [],
          name: "Site",
          visible: true,
          locked: false,
          transform: {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
          },
        },
      },
      rootNodeIds: ["11111111-1111-4111-8111-111111111111"],
    });

    expect(result.status).toBe("ok");
    if (result.status === "error") {
      throw new Error("expected a successful scene load");
    }
    expect(result.sceneData.schemaVersion).toBe(CURRENT_SCENE_SCHEMA_VERSION);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("repairs empty persisted scenes back to a starter scene", () => {
    const result = loadPascalScene('{"nodes":{},"rootNodeIds":[]}');

    expect(result.status).toBe("recovered");
    if (result.status === "error") {
      throw new Error("expected a recovered scene load");
    }
    expect(Object.keys(result.sceneData.nodes).length).toBeGreaterThanOrEqual(3);
    expect(result.sceneData.rootNodeIds).toHaveLength(1);
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === "empty-scene")).toBe(true);
  });

  it("fills in missing node defaults for legacy scenes", () => {
    const result = loadPascalScene({
      nodes: {
        "11111111-1111-4111-8111-111111111111": {
          id: "11111111-1111-4111-8111-111111111111",
          type: "site",
        },
      },
      rootNodeIds: ["11111111-1111-4111-8111-111111111111"],
    });

    expect(result.status).toBe("recovered");
    if (result.status === "error") {
      throw new Error("expected a recovered scene load");
    }

    const site = result.sceneData.nodes["11111111-1111-4111-8111-111111111111"];
    expect(site.childIds).toEqual([]);
    expect(site.visible).toBe(true);
    expect(site.locked).toBe(false);
    expect(site.name).toContain("site-");
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === "scene-version-defaulted")).toBe(true);
  });

  it("rejects malformed JSON payloads with parse diagnostics", () => {
    const result = loadPascalScene("{not-valid-json");

    expect(result.status).toBe("error");
    expect(result.diagnostics.some((diagnostic) => diagnostic.stage === "parse")).toBe(true);
  });

  it("rejects scenes with door or window references to missing walls", () => {
    const result = loadPascalScene({
      nodes: {
        "11111111-1111-4111-8111-111111111111": {
          id: "11111111-1111-4111-8111-111111111111",
          type: "site",
          parentId: null,
          childIds: ["22222222-2222-4222-8222-222222222222"],
          name: "Site",
          visible: true,
          locked: false,
          transform: {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
          },
        },
        "22222222-2222-4222-8222-222222222222": {
          id: "22222222-2222-4222-8222-222222222222",
          type: "door",
          parentId: "11111111-1111-4111-8111-111111111111",
          childIds: [],
          name: "Door",
          visible: true,
          locked: false,
          wallId: "33333333-3333-4333-8333-333333333333",
          position: 0.5,
          width: 0.9,
          height: 2.1,
          doorType: "single",
          swing: "left",
          transform: {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
          },
        },
      },
      rootNodeIds: ["11111111-1111-4111-8111-111111111111"],
    });

    // Scene should now recover by removing the orphan door instead of failing
    expect(result.status).toBe("recovered");
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === "orphan-wall-ref-removed")).toBe(true);
    // The door should have been removed from the scene
    expect(result.sceneData).not.toBeNull();
    const nodeTypes = Object.values(result.sceneData!.nodes).map((n) => n.type);
    expect(nodeTypes).not.toContain("door");
  });
});
