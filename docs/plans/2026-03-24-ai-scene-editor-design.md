# AI Scene Editor — Design Document

**Date**: 2026-03-24
**Status**: Approved
**Strategy**: Gemini function calling with structured tool use for material changes and furniture placement

---

## 1. Overview

Users can type natural language prompts in the editor to change materials and add/remove/swap furniture. Gemini interprets the prompt against the current scene context and returns structured function calls that are previewed before applying.

**Scope**: Materials + furniture only (no structural/wall changes).

---

## 2. UI: AIEditPanel

Replace `AIGeneratePanel` with a chat-style interface in the left sidebar:

- **Chat input**: Text field + send button at bottom
- **Message history**: Scrollable list of user prompts + AI responses
- **Action preview**: Before applying, show list of proposed changes
- **Apply/Cancel**: User confirms before mutations hit the scene
- **Credit display**: Show remaining generation credits
- **Tab toggle**: Switch between "Generate" (image upload) and "Edit" (chat) modes

Located in existing left panel where `AIGeneratePanel` lives.

---

## 3. Gemini Tools (Function Definitions)

| Tool | Parameters | Scene Action |
|------|-----------|--------------|
| `change_material` | `nodeType` (wall/slab/ceiling), `roomName?`, `finishId`, `variantId` | `updateNode()` on matching nodes |
| `add_furniture` | `roomName`, `catalogId` | `addNode()` with auto-positioned placement |
| `remove_furniture` | `itemName` or `catalogId` | `deleteNode()` on matching items |
| `swap_furniture` | `itemName`, `newCatalogId` | `deleteNode()` + `addNode()` at same position |
| `change_assembly` | `assemblyId` | Apply finish preset to all walls/slabs/ceilings |

Available materials from `shared/material-library.ts`: wall-plaster, wall-brick, wall-stone, slab-concrete, slab-oak, ceiling-plaster, roof-slate, roof-clay-tile, item-oak, item-boucle, item-stone, glass-clear.

Available assembly presets: warm-minimal, contemporary-stone, nordic-oak.

---

## 4. API Endpoint

`POST /api/floorplans/:id/ai-edit`

**Request:**
```json
{
  "prompt": "Make the kitchen walls marble and add a dining table",
  "sceneContext": {
    "rooms": [{ "name": "Kitchen", "zoneType": "kitchen", "items": ["Fridge", "Oven"] }],
    "materials": { "walls": "wall-plaster/warm", "slabs": "slab-concrete/smooth" },
    "availableCatalog": ["sofa-01", "dining-table-01", ...],
    "availableMaterials": ["wall-plaster", "wall-brick", "wall-stone", ...]
  }
}
```

**Response:**
```json
{
  "actions": [
    { "tool": "change_material", "args": { "roomName": "Kitchen", "nodeType": "wall", "finishId": "wall-stone", "variantId": "travertine" } },
    { "tool": "add_furniture", "args": { "roomName": "Kitchen", "catalogId": "dining-table-01" } }
  ],
  "explanation": "I'll change the Kitchen walls to stone travertine and add a dining table."
}
```

**Server logic:**
1. `canUserGenerate()` + `deductCredit()` — 1 credit per prompt
2. Build compact scene context from stored sceneData
3. Call Gemini with function calling tool definitions
4. Parse and return structured actions

---

## 5. Client Execution Flow

```
User prompt → POST /api/floorplans/:id/ai-edit → Gemini function calls
  → Preview in UI → User clicks "Apply"
  → Execute actions via useScene store mutations:
    - change_material → updateNode(nodeId, { finishId, finishVariantId })
    - add_furniture → addNode(itemNode, levelId)
    - remove_furniture → deleteNode(nodeId)
    - swap_furniture → deleteNode + addNode at same position
    - change_assembly → batch updateNode on all walls/slabs/ceilings
  → Pascal bridge auto-syncs to 3D renderer
  → All changes undoable via Ctrl+Z
```

---

## 6. Files to Create/Modify

- Create: `client/src/components/editor/AIEditPanel.tsx` — chat UI component
- Create: `api/floorplans/[id]/ai-edit.ts` — API endpoint
- Create: `lib/ai-scene-editor.ts` — Gemini function calling logic + tool definitions
- Create: `client/src/lib/ai-edit-actions.ts` — client-side action executor
- Modify: `client/src/components/editor/FloorplanEditor.tsx` — add AIEditPanel to layout
- Modify: `client/src/lib/api.ts` — add `aiEditScene()` client function

---

## 7. Success Criteria

1. User can type prompts like "Change walls to brick" or "Add a sofa to the living room"
2. AI returns structured actions that are previewed before applying
3. User confirms before changes apply
4. All changes are undoable (Ctrl+Z)
5. Credit system enforced (1 credit per prompt)
6. Material changes visually update in the 3D viewer
7. Furniture additions appear with proper GLB models
8. No scene corruption — all mutations go through useScene store
