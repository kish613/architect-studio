import { describe, it, expect } from "vitest";
import { buildSceneContext, parseAIEditActions } from "../ai-scene-editor";

describe("AI Scene Editor", () => {
  it("buildSceneContext creates compact context from scene nodes", () => {
    const nodes = {
      "z1": { id: "z1", type: "zone", name: "Kitchen", zoneType: "kitchen", childIds: [], parentId: "l1", label: "Kitchen", color: "#F4D03F", points: [], transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } }, visible: true, locked: false },
      "w1": { id: "w1", type: "wall", name: "wall-1", parentId: "l1", childIds: [], start: { x: 0, y: 0, z: 0 }, end: { x: 5, y: 0, z: 0 }, height: 2.7, thickness: 0.15, material: "plaster", finishId: "wall-plaster", finishVariantId: "warm", transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } }, visible: true, locked: false },
      "i1": { id: "i1", type: "item", name: "Fridge", parentId: "l1", childIds: [], itemType: "appliance", catalogId: "fridge-01", dimensions: { x: 0.7, y: 1.8, z: 0.7 }, material: "wood", transform: { position: { x: 1, y: 0, z: 1 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } }, visible: true, locked: false },
    } as any;

    const ctx = buildSceneContext(nodes);
    expect(ctx.rooms.length).toBe(1);
    expect(ctx.rooms[0].name).toBe("Kitchen");
    expect(ctx.items.length).toBe(1);
    expect(ctx.items[0].name).toBe("Fridge");
  });

  it("parseAIEditActions parses Gemini function call responses", () => {
    const geminiResponse = {
      candidates: [{
        content: {
          parts: [{
            functionCall: {
              name: "change_material",
              args: { roomName: "Kitchen", nodeType: "wall", finishId: "wall-brick", variantId: "red" }
            }
          }]
        }
      }]
    };
    const actions = parseAIEditActions(geminiResponse);
    expect(actions.length).toBe(1);
    expect(actions[0].tool).toBe("change_material");
    expect(actions[0].args.finishId).toBe("wall-brick");
  });

  it("parseAIEditActions handles multiple function calls", () => {
    const geminiResponse = {
      candidates: [{
        content: {
          parts: [
            { functionCall: { name: "change_material", args: { nodeType: "wall", finishId: "wall-brick", variantId: "red" } } },
            { functionCall: { name: "add_furniture", args: { roomName: "Kitchen", catalogId: "dining-table-01" } } },
          ]
        }
      }]
    };
    const actions = parseAIEditActions(geminiResponse);
    expect(actions.length).toBe(2);
  });

  it("parseAIEditActions returns empty for no function calls", () => {
    const geminiResponse = { candidates: [{ content: { parts: [{ text: "I can help with that" }] } }] };
    expect(parseAIEditActions(geminiResponse)).toEqual([]);
  });
});
