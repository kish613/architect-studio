import { MATERIAL_LIBRARY } from "../shared/material-library.js";
import { FURNITURE_CATALOG } from "../shared/furniture-catalog.js";

// ─── Types ───────────────────────────────────────────────────

export interface SceneContext {
  rooms: { id: string; name: string; zoneType: string }[];
  items: { id: string; name: string; catalogId?: string; position: { x: number; y: number; z: number } }[];
  wallMaterial: { finishId: string; variantId: string } | null;
  slabMaterial: { finishId: string; variantId: string } | null;
}

export interface AIEditAction {
  tool: string;
  args: Record<string, any>;
}

// ─── Scene Context Builder ───────────────────────────────────

export function buildSceneContext(nodes: Record<string, any>): SceneContext {
  const rooms: SceneContext["rooms"] = [];
  const items: SceneContext["items"] = [];
  let wallMaterial: SceneContext["wallMaterial"] = null;
  let slabMaterial: SceneContext["slabMaterial"] = null;

  for (const node of Object.values(nodes)) {
    switch (node.type) {
      case "zone":
        rooms.push({
          id: node.id,
          name: node.name || node.label || "Unnamed",
          zoneType: node.zoneType || "generic",
        });
        break;

      case "item":
        items.push({
          id: node.id,
          name: node.name || "Unnamed Item",
          catalogId: node.catalogId,
          position: node.transform?.position ?? { x: 0, y: 0, z: 0 },
        });
        break;

      case "wall":
        if (!wallMaterial && node.finishId) {
          wallMaterial = {
            finishId: node.finishId,
            variantId: node.finishVariantId || "default",
          };
        }
        break;

      case "slab":
        if (!slabMaterial && node.finishId) {
          slabMaterial = {
            finishId: node.finishId,
            variantId: node.finishVariantId || "default",
          };
        }
        break;
    }
  }

  return { rooms, items, wallMaterial, slabMaterial };
}

// ─── Gemini Tool Declarations ────────────────────────────────

export const AI_EDIT_TOOLS = [
  {
    name: "change_material",
    description:
      "Change the material/finish of walls or slabs in a room. Use finishId and variantId from the material library.",
    parameters: {
      type: "object",
      properties: {
        roomName: { type: "string", description: "Name of the room to apply material to" },
        nodeType: { type: "string", enum: ["wall", "slab"], description: "Surface type to change" },
        finishId: { type: "string", description: "Material finish ID from the library" },
        variantId: { type: "string", description: "Variant ID within the finish" },
      },
      required: ["nodeType", "finishId", "variantId"],
    },
  },
  {
    name: "add_furniture",
    description:
      "Add a piece of furniture from the catalog to a room.",
    parameters: {
      type: "object",
      properties: {
        roomName: { type: "string", description: "Room to place the furniture in" },
        catalogId: { type: "string", description: "Catalog item ID" },
        position: {
          type: "object",
          description: "Optional placement position",
          properties: {
            x: { type: "number" },
            y: { type: "number" },
            z: { type: "number" },
          },
        },
      },
      required: ["roomName", "catalogId"],
    },
  },
  {
    name: "remove_furniture",
    description:
      "Remove a piece of furniture from the scene by its name or ID.",
    parameters: {
      type: "object",
      properties: {
        itemName: { type: "string", description: "Name of the item to remove" },
        itemId: { type: "string", description: "ID of the item to remove" },
      },
    },
  },
  {
    name: "swap_furniture",
    description:
      "Replace an existing furniture item with a different catalog item.",
    parameters: {
      type: "object",
      properties: {
        itemName: { type: "string", description: "Name of the item to replace" },
        itemId: { type: "string", description: "ID of the item to replace" },
        newCatalogId: { type: "string", description: "Catalog ID of the replacement item" },
      },
      required: ["newCatalogId"],
    },
  },
  {
    name: "change_assembly",
    description:
      "Change a kitchen/bathroom assembly style (e.g. cabinet fronts, countertop material).",
    parameters: {
      type: "object",
      properties: {
        roomName: { type: "string", description: "Room containing the assembly" },
        assemblyType: {
          type: "string",
          enum: ["cabinet", "countertop", "backsplash"],
          description: "Type of assembly to change",
        },
        finishId: { type: "string", description: "New finish ID for the assembly" },
        variantId: { type: "string", description: "New variant ID" },
      },
      required: ["assemblyType", "finishId"],
    },
  },
];

// ─── Response Parsing ────────────────────────────────────────

export function parseAIEditActions(geminiResponse: any): AIEditAction[] {
  const actions: AIEditAction[] = [];

  const candidates = geminiResponse?.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return actions;

  const parts = candidates[0]?.content?.parts;
  if (!Array.isArray(parts)) return actions;

  for (const part of parts) {
    if (part.functionCall) {
      actions.push({
        tool: part.functionCall.name,
        args: part.functionCall.args ?? {},
      });
    }
  }

  return actions;
}

// ─── Request Builder ─────────────────────────────────────────

function buildMaterialSummary(): string {
  const ids = MATERIAL_LIBRARY.map((m) => `${m.id} (${m.label})`).join(", ");
  return `Available materials: ${ids}`;
}

function buildCatalogSummary(): string {
  const ids = FURNITURE_CATALOG.map((c) => `${c.id} (${c.label})`).join(", ");
  return `Available furniture: ${ids}`;
}

export function buildGeminiEditRequest(prompt: string, context: SceneContext) {
  const systemInstruction = [
    "You are an interior design AI assistant that edits 3D floorplan scenes.",
    "Given the current scene context and user request, call the appropriate tool functions to make changes.",
    "Only call tools that are needed. You may call multiple tools in one response.",
    "",
    buildMaterialSummary(),
    "",
    buildCatalogSummary(),
    "",
    "Current scene:",
    `Rooms: ${context.rooms.map((r) => `${r.name} (${r.zoneType})`).join(", ") || "none"}`,
    `Furniture: ${context.items.map((i) => `${i.name}${i.catalogId ? ` [${i.catalogId}]` : ""}`).join(", ") || "none"}`,
    `Wall finish: ${context.wallMaterial ? `${context.wallMaterial.finishId}/${context.wallMaterial.variantId}` : "default"}`,
    `Slab finish: ${context.slabMaterial ? `${context.slabMaterial.finishId}/${context.slabMaterial.variantId}` : "default"}`,
  ].join("\n");

  return {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    tools: [
      {
        function_declarations: AI_EDIT_TOOLS,
      },
    ],
  };
}

// ─── Gemini API Caller ───────────────────────────────────────

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export async function callGeminiForEdits(
  prompt: string,
  context: SceneContext,
): Promise<{ actions: AIEditAction[]; explanation: string }> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GEMINI_API_KEY is not configured");
  }

  const body = buildGeminiEditRequest(prompt, context);

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${text}`);
  }

  const json = await res.json();
  const actions = parseAIEditActions(json);

  // Extract any text explanation from the response
  let explanation = "";
  const parts = json?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    for (const part of parts) {
      if (part.text) {
        explanation += part.text;
      }
    }
  }

  return { actions, explanation };
}
