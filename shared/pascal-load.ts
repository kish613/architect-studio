import {
  anyNodeSchema,
  createEmptyScene,
  CURRENT_SCENE_SCHEMA_VERSION,
  sceneDataSchema,
  type AnyNode,
  type NodeType,
  type SceneData,
} from "./pascal-scene.js";

export { CURRENT_SCENE_SCHEMA_VERSION } from "./pascal-scene.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MISSING_WALL_SENTINEL_ID = "00000000-0000-4000-8000-000000000000";
const NODE_TYPES: readonly NodeType[] = [
  "site",
  "building",
  "level",
  "zone",
  "wall",
  "ceiling",
  "slab",
  "roof",
  "door",
  "window",
  "guide",
  "scan",
  "item",
];

export type PascalSceneLoadStage = "parse" | "normalize" | "validate" | "fetch" | "render";
export type PascalSceneLoadStatus = "ok" | "recovered" | "error";

export interface PascalSceneDiagnostic {
  stage: PascalSceneLoadStage;
  code: string;
  message: string;
  nodeId?: string;
}

interface PascalSceneLoadBase {
  diagnostics: PascalSceneDiagnostic[];
}

export interface PascalSceneLoadSuccess extends PascalSceneLoadBase {
  status: "ok" | "recovered";
  sceneData: SceneData;
}

export interface PascalSceneLoadError extends PascalSceneLoadBase {
  status: "error";
  sceneData: null;
}

export type PascalSceneLoadResult = PascalSceneLoadSuccess | PascalSceneLoadError;

type MutableNodeMap = Record<string, AnyNode>;
type UnknownRecord = Record<string, unknown>;

export function loadPascalScene(input: string | unknown): PascalSceneLoadResult {
  const diagnostics: PascalSceneDiagnostic[] = [];
  let parsedInput: unknown;

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) {
      diagnostics.push({
        stage: "parse",
        code: "empty-scene",
        message: "Stored Pascal payload was blank. Replaced with a starter scene.",
      });
      return {
        status: "recovered",
        sceneData: createEmptyScene(),
        diagnostics,
      };
    }

    try {
      parsedInput = JSON.parse(trimmed);
    } catch (error) {
      diagnostics.push({
        stage: "parse",
        code: "parse-error",
        message:
          error instanceof Error
            ? `Pascal scene JSON could not be parsed: ${error.message}`
            : "Pascal scene JSON could not be parsed.",
      });
      return {
        status: "error",
        sceneData: null,
        diagnostics,
      };
    }
  } else {
    parsedInput = input;
  }

  const normalized = normalizeScene(parsedInput, diagnostics);
  if (!normalized) {
    return {
      status: "error",
      sceneData: null,
      diagnostics,
    };
  }

  try {
    const sceneData = sceneDataSchema.parse(normalized);
    // Repair bad wall references by removing orphan doors/windows
    // instead of rejecting the entire scene (which causes blank screens)
    const { repaired, diagnostics: refDiags } = repairSceneReferences(sceneData);
    if (refDiags.length > 0) {
      diagnostics.push(...refDiags);
    }

    return {
      status: diagnostics.length > 0 ? "recovered" : "ok",
      sceneData: repaired,
      diagnostics,
    };
  } catch (error) {
    diagnostics.push({
      stage: "validate",
      code: "schema-validation-failed",
      message:
        error instanceof Error
          ? `Pascal scene validation failed: ${error.message}`
          : "Pascal scene validation failed.",
    });
    return {
      status: "error",
      sceneData: null,
      diagnostics,
    };
  }
}

export function ensurePascalScene(input: string | unknown): PascalSceneLoadSuccess {
  const result = loadPascalScene(input);
  if (result.status === "error") {
    const error = new Error(result.diagnostics.map((diagnostic) => diagnostic.message).join(" | "));
    (error as Error & { diagnostics?: PascalSceneDiagnostic[] }).diagnostics = result.diagnostics;
    throw error;
  }

  return result;
}

function normalizeScene(
  rawScene: unknown,
  diagnostics: PascalSceneDiagnostic[]
): SceneData | null {
  const sceneObject = asRecord(rawScene);
  if (!sceneObject) {
    diagnostics.push({
      stage: "validate",
      code: "scene-not-an-object",
      message: "Pascal scene payload must be a JSON object.",
    });
    return null;
  }

  const rawNodes = asRecord(sceneObject.nodes);
  if (!rawNodes || Object.keys(rawNodes).length === 0) {
    diagnostics.push({
      stage: "normalize",
      code: "empty-scene",
      message: "Pascal scene had no nodes. Replaced with a starter scene.",
    });
    return createEmptyScene();
  }

  const nodes: MutableNodeMap = {};
  let recovered = false;

  for (const [recordKey, rawNode] of Object.entries(rawNodes)) {
    const normalizedNode = normalizeNodeRecord(recordKey, rawNode, diagnostics);
    if (!normalizedNode) {
      return null;
    }

    if (normalizedNode.recovered) {
      recovered = true;
    }

    nodes[normalizedNode.node.id] = normalizedNode.node;
  }

  if (!Number.isInteger(sceneObject.schemaVersion)) {
    diagnostics.push({
      stage: "normalize",
      code: "scene-version-defaulted",
      message: `Pascal scene schema version missing. Defaulted to ${CURRENT_SCENE_SCHEMA_VERSION}.`,
    });
    recovered = true;
  }

  const sceneData: SceneData = {
    schemaVersion: CURRENT_SCENE_SCHEMA_VERSION,
    nodes: rebuildHierarchy(nodes, diagnostics),
    rootNodeIds: [],
  };

  const requestedRootIds = Array.isArray(sceneObject.rootNodeIds)
    ? sceneObject.rootNodeIds.filter((value): value is string => isUuid(value))
    : [];
  const rootNodeIds = requestedRootIds.filter((nodeId) => !!sceneData.nodes[nodeId]);

  if (rootNodeIds.length > 0) {
    sceneData.rootNodeIds = rootNodeIds;
  } else {
    sceneData.rootNodeIds = Object.values(sceneData.nodes)
      .filter((node) => node.parentId === null)
      .map((node) => node.id);
  }

  if (sceneData.rootNodeIds.length === 0) {
    const firstNode = Object.values(sceneData.nodes)[0];
    if (!firstNode) {
      diagnostics.push({
        stage: "validate",
        code: "scene-missing-roots",
        message: "Pascal scene could not determine any root nodes.",
      });
      return null;
    }

    sceneData.nodes[firstNode.id] = { ...firstNode, parentId: null };
    sceneData.nodes = rebuildHierarchy(sceneData.nodes, diagnostics);
    sceneData.rootNodeIds = [firstNode.id];
    diagnostics.push({
      stage: "normalize",
      code: "root-node-defaulted",
      message: `Pascal scene had no root nodes. Promoted "${firstNode.name}" to root.`,
      nodeId: firstNode.id,
    });
    recovered = true;
  }

  return recovered ? sceneDataSchema.parse(sceneData) : sceneData;
}

function normalizeNodeRecord(
  recordKey: string,
  rawNode: unknown,
  diagnostics: PascalSceneDiagnostic[]
): { node: AnyNode; recovered: boolean } | null {
  const nodeRecord = asRecord(rawNode);
  if (!nodeRecord) {
    diagnostics.push({
      stage: "validate",
      code: "node-not-an-object",
      message: `Pascal node "${recordKey}" is not an object.`,
      nodeId: recordKey,
    });
    return null;
  }

  const type = parseNodeType(nodeRecord.type);
  if (!type) {
    diagnostics.push({
      stage: "validate",
      code: "unknown-node-type",
      message: `Pascal node "${recordKey}" is missing a supported type.`,
      nodeId: recordKey,
    });
    return null;
  }

  const nodeId =
    typeof nodeRecord.id === "string" && isUuid(nodeRecord.id)
      ? nodeRecord.id
      : isUuid(recordKey)
        ? recordKey
        : crypto.randomUUID();
  const baseDefaultsApplied =
    nodeId !== nodeRecord.id ||
    !Array.isArray(nodeRecord.childIds) ||
    typeof nodeRecord.name !== "string" ||
    typeof nodeRecord.visible !== "boolean" ||
    typeof nodeRecord.locked !== "boolean";

  const base = {
    id: nodeId,
    type,
    parentId: typeof nodeRecord.parentId === "string" && isUuid(nodeRecord.parentId) ? nodeRecord.parentId : null,
    childIds: Array.isArray(nodeRecord.childIds)
      ? nodeRecord.childIds.filter((value): value is string => typeof value === "string" && isUuid(value))
      : [],
    name:
      typeof nodeRecord.name === "string" && nodeRecord.name.trim().length > 0
        ? nodeRecord.name
        : `${type}-${nodeId.slice(0, 4)}`,
    visible: typeof nodeRecord.visible === "boolean" ? nodeRecord.visible : true,
    locked: typeof nodeRecord.locked === "boolean" ? nodeRecord.locked : false,
  };

  try {
    const node = anyNodeSchema.parse(buildNodePayload(type, nodeRecord, base));
    if (baseDefaultsApplied) {
      diagnostics.push({
        stage: "normalize",
        code: "legacy-node-defaults",
        message: `Pascal node "${node.name}" was missing defaults and has been normalized.`,
        nodeId: node.id,
      });
    }
    return { node, recovered: baseDefaultsApplied };
  } catch (error) {
    diagnostics.push({
      stage: "validate",
      code: "node-schema-invalid",
      message:
        error instanceof Error
          ? `Pascal node "${base.name}" is invalid: ${error.message}`
          : `Pascal node "${base.name}" is invalid.`,
      nodeId: base.id,
    });
    return null;
  }
}

function buildNodePayload(
  type: NodeType,
  nodeRecord: UnknownRecord,
  base: {
    id: string;
    type: NodeType;
    parentId: string | null;
    childIds: string[];
    name: string;
    visible: boolean;
    locked: boolean;
  }
): UnknownRecord {
  const transform = coerceTransform(nodeRecord.transform);

  switch (type) {
    case "site":
    case "building":
      return {
        ...base,
        type,
        transform,
      };
    case "level":
      return {
        ...base,
        type,
        elevation: coerceNumber(nodeRecord.elevation, 0),
        height: coerceNumber(nodeRecord.height, 2.7),
        index: coerceInteger(nodeRecord.index, 0),
        assemblyId: coerceOptionalString(nodeRecord.assemblyId),
        transform,
      };
    case "zone":
      return {
        ...base,
        type,
        zoneType: coerceEnum(nodeRecord.zoneType, [
          "room",
          "hallway",
          "bathroom",
          "kitchen",
          "bedroom",
          "living",
          "garage",
          "utility",
          "other",
        ] as const, "room"),
        label: coerceString(nodeRecord.label, ""),
        color: coerceString(nodeRecord.color, "#4A90D9"),
        points: coerceVec3Array(nodeRecord.points),
        assemblyId: coerceOptionalString(nodeRecord.assemblyId),
        transform,
      };
    case "wall":
      return {
        ...base,
        type,
        start: coerceVec3(nodeRecord.start, { x: 0, y: 0, z: 0 }),
        end: coerceVec3(nodeRecord.end, { x: 1, y: 0, z: 0 }),
        height: coerceNumber(nodeRecord.height, 2.7),
        thickness: coerceNumber(nodeRecord.thickness, 0.15),
        material: coerceString(nodeRecord.material, "plaster"),
        finishId: coerceOptionalString(nodeRecord.finishId),
        finishVariantId: coerceOptionalString(nodeRecord.finishVariantId),
        assemblyId: coerceOptionalString(nodeRecord.assemblyId),
        uvScale: coerceUvScale(nodeRecord.uvScale),
        transform,
      };
    case "ceiling":
      return {
        ...base,
        type,
        points: coerceVec3Array(nodeRecord.points),
        height: coerceNumber(nodeRecord.height, 0.2),
        material: coerceString(nodeRecord.material, "plaster"),
        finishId: coerceOptionalString(nodeRecord.finishId),
        finishVariantId: coerceOptionalString(nodeRecord.finishVariantId),
        assemblyId: coerceOptionalString(nodeRecord.assemblyId),
        uvScale: coerceUvScale(nodeRecord.uvScale),
        transform,
      };
    case "slab":
      return {
        ...base,
        type,
        points: coerceVec3Array(nodeRecord.points),
        thickness: coerceNumber(nodeRecord.thickness, 0.3),
        material: coerceString(nodeRecord.material, "concrete"),
        finishId: coerceOptionalString(nodeRecord.finishId),
        finishVariantId: coerceOptionalString(nodeRecord.finishVariantId),
        assemblyId: coerceOptionalString(nodeRecord.assemblyId),
        uvScale: coerceUvScale(nodeRecord.uvScale),
        transform,
      };
    case "roof":
      return {
        ...base,
        type,
        roofType: coerceEnum(nodeRecord.roofType, ["flat", "gable", "hip", "mansard", "shed"] as const, "gable"),
        pitch: coerceNumber(nodeRecord.pitch, 35),
        overhang: coerceNumber(nodeRecord.overhang, 0.3),
        points: coerceVec3Array(nodeRecord.points),
        material: coerceString(nodeRecord.material, "tile"),
        finishId: coerceOptionalString(nodeRecord.finishId),
        finishVariantId: coerceOptionalString(nodeRecord.finishVariantId),
        assemblyId: coerceOptionalString(nodeRecord.assemblyId),
        uvScale: coerceUvScale(nodeRecord.uvScale),
        transform,
      };
    case "door":
      return {
        ...base,
        type,
        wallId:
          typeof nodeRecord.wallId === "string" && isUuid(nodeRecord.wallId)
            ? nodeRecord.wallId
            : MISSING_WALL_SENTINEL_ID,
        position: coerceNumber(nodeRecord.position, 0.5),
        width: coerceNumber(nodeRecord.width, 0.9),
        height: coerceNumber(nodeRecord.height, 2.1),
        doorType: coerceEnum(nodeRecord.doorType, ["single", "double", "sliding", "french", "bifold"] as const, "single"),
        swing: coerceEnum(nodeRecord.swing, ["left", "right"] as const, "left"),
        transform,
      };
    case "window":
      return {
        ...base,
        type,
        wallId:
          typeof nodeRecord.wallId === "string" && isUuid(nodeRecord.wallId)
            ? nodeRecord.wallId
            : MISSING_WALL_SENTINEL_ID,
        position: coerceNumber(nodeRecord.position, 0.5),
        width: coerceNumber(nodeRecord.width, 1.2),
        height: coerceNumber(nodeRecord.height, 1.2),
        sillHeight: coerceNumber(nodeRecord.sillHeight, 0.9),
        windowType: coerceEnum(
          nodeRecord.windowType,
          ["fixed", "casement", "sash", "sliding", "bay", "skylight"] as const,
          "casement"
        ),
        transform,
      };
    case "guide":
      return {
        ...base,
        type,
        guideType: coerceEnum(nodeRecord.guideType, ["line", "grid", "reference"] as const, "line"),
        start: coerceVec3(nodeRecord.start, { x: 0, y: 0, z: 0 }),
        end: coerceVec3(nodeRecord.end, { x: 1, y: 0, z: 0 }),
        transform,
      };
    case "scan":
      return {
        ...base,
        type,
        imageUrl: coerceString(nodeRecord.imageUrl, ""),
        width: coerceNumber(nodeRecord.width, 10),
        height: coerceNumber(nodeRecord.height, 10),
        opacity: Math.max(0, Math.min(1, coerceNumber(nodeRecord.opacity, 0.5))),
        transform,
      };
    case "item":
      return {
        ...base,
        type,
        itemType: coerceEnum(
          nodeRecord.itemType,
          ["furniture", "appliance", "fixture", "light", "custom"] as const,
          "furniture"
        ),
        catalogId: coerceOptionalString(nodeRecord.catalogId),
        dimensions: coerceDimensions(nodeRecord.dimensions),
        material: coerceString(nodeRecord.material, "wood"),
        modelUrl: coerceOptionalString(nodeRecord.modelUrl),
        finishId: coerceOptionalString(nodeRecord.finishId),
        finishVariantId: coerceOptionalString(nodeRecord.finishVariantId),
        materialSlots: coerceMaterialSlots(nodeRecord.materialSlots),
        assetQualityTier: coerceEnum(
          nodeRecord.assetQualityTier,
          ["placeholder", "draft", "production"] as const,
          "placeholder"
        ),
        assetStyleTier: coerceEnum(nodeRecord.assetStyleTier, ["realistic", "stylized"] as const, "realistic"),
        bimRef: coerceBimRef(nodeRecord.bimRef),
        transform,
      };
  }
}

function rebuildHierarchy(nodes: MutableNodeMap, diagnostics: PascalSceneDiagnostic[]): MutableNodeMap {
  const normalizedNodes: MutableNodeMap = Object.fromEntries(
    Object.values(nodes).map((node) => [node.id, { ...node, childIds: [] }])
  );

  for (const node of Object.values(normalizedNodes)) {
    if (!node.parentId) {
      continue;
    }

    const parent = normalizedNodes[node.parentId];
    if (!parent) {
      normalizedNodes[node.id] = { ...node, parentId: null };
      diagnostics.push({
        stage: "normalize",
        code: "orphan-parent-cleared",
        message: `Pascal node "${node.name}" referenced a missing parent and was promoted to root.`,
        nodeId: node.id,
      });
      continue;
    }

    parent.childIds = [...parent.childIds, node.id];
  }

  return normalizedNodes;
}

/**
 * Repair (not reject) bad wall references.
 * Doors/windows referencing non-existent walls are removed from the scene
 * and their parent's childIds are cleaned up. This prevents blank screens
 * from a single bad reference killing the entire render pipeline.
 */
function repairSceneReferences(sceneData: SceneData): {
  repaired: SceneData;
  diagnostics: PascalSceneDiagnostic[];
} {
  const diagnostics: PascalSceneDiagnostic[] = [];
  const nodesToRemove = new Set<string>();

  for (const node of Object.values(sceneData.nodes)) {
    if (node.type !== "door" && node.type !== "window") {
      continue;
    }

    const wallNode = sceneData.nodes[node.wallId];
    if (!wallNode || wallNode.type !== "wall") {
      nodesToRemove.add(node.id);
      diagnostics.push({
        stage: "validate",
        code: "orphan-wall-ref-removed",
        message: `Pascal ${node.type} "${node.name}" referenced missing wall "${node.wallId}" — removed from scene.`,
        nodeId: node.id,
      });
    }
  }

  if (nodesToRemove.size === 0) {
    return { repaired: sceneData, diagnostics };
  }

  // Remove orphan nodes and clean up parent childIds
  const repairedNodes = { ...sceneData.nodes };
  for (const id of nodesToRemove) {
    const node = repairedNodes[id];
    if (node?.parentId && repairedNodes[node.parentId]) {
      const parent = repairedNodes[node.parentId];
      repairedNodes[node.parentId] = {
        ...parent,
        childIds: parent.childIds.filter((cid) => cid !== id),
      } as typeof parent;
    }
    delete repairedNodes[id];
  }

  return {
    repaired: {
      ...sceneData,
      nodes: repairedNodes,
      rootNodeIds: sceneData.rootNodeIds.filter((id) => !nodesToRemove.has(id)),
    },
    diagnostics,
  };
}

function parseNodeType(value: unknown): NodeType | null {
  return typeof value === "string" && NODE_TYPES.includes(value as NodeType)
    ? (value as NodeType)
    : null;
}

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : null;
}

function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

function coerceTransform(value: unknown) {
  const transform = asRecord(value);
  return {
    position: coerceVec3(transform?.position, { x: 0, y: 0, z: 0 }),
    rotation: coerceVec3(transform?.rotation, { x: 0, y: 0, z: 0 }),
    scale: coerceVec3(transform?.scale, { x: 1, y: 1, z: 1 }),
  };
}

function coerceVec3(value: unknown, fallback: { x: number; y: number; z: number }) {
  const record = asRecord(value);
  return {
    x: coerceNumber(record?.x, fallback.x),
    y: coerceNumber(record?.y, fallback.y),
    z: coerceNumber(record?.z, fallback.z),
  };
}

function coerceDimensions(value: unknown) {
  const dimensions = coerceVec3(value, { x: 1, y: 1, z: 1 });
  return {
    x: Math.max(dimensions.x, 0.01),
    y: Math.max(dimensions.y, 0.01),
    z: Math.max(dimensions.z, 0.01),
  };
}

function coerceVec3Array(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => coerceVec3(entry, { x: 0, y: 0, z: 0 }));
}

function coerceUvScale(value: unknown) {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  return {
    x: Math.max(0.1, coerceNumber(record.x, 1)),
    y: Math.max(0.1, coerceNumber(record.y, 1)),
  };
}

function coerceMaterialSlots(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) {
        return null;
      }

      const slotId = coerceOptionalString(record.slotId);
      const label = coerceOptionalString(record.label);
      const finishId = coerceOptionalString(record.finishId);
      if (!slotId || !label || !finishId) {
        return null;
      }

      return {
        slotId,
        label,
        finishId,
        finishVariantId: coerceOptionalString(record.finishVariantId),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

function coerceBimRef(value: unknown) {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  const source = coerceEnum(record.source, ["ifc", "catalog"] as const, "catalog");
  const externalId = coerceOptionalString(record.externalId);
  if (!externalId) {
    return undefined;
  }

  return {
    source,
    externalId,
    className: coerceOptionalString(record.className),
    propertySetKeys: Array.isArray(record.propertySetKeys)
      ? record.propertySetKeys.filter((entry): entry is string => typeof entry === "string")
      : undefined,
  };
}

function coerceEnum<T extends readonly string[]>(
  value: unknown,
  allowedValues: T,
  fallback: T[number]
): T[number] {
  return typeof value === "string" && allowedValues.includes(value) ? value : fallback;
}

function coerceString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function coerceOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function coerceNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function coerceInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) ? value : fallback;
}
