import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type {
  AssetProvenance,
  BimReference,
  CatalogMaterialSlot,
} from "../shared/material-library.js";
import type {
  FurnitureAssetCategory,
  FurnitureAssetQualityTier,
  FurnitureAssetStyleTier,
} from "../shared/furniture-assets.js";

const rawBimAssetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum([
    "living",
    "bedroom",
    "kitchen",
    "bathroom",
    "office",
    "utility",
    "decor",
    "outdoor",
    "garage",
  ]),
  modelUrl: z.string().min(1),
  previewUrl: z.string().optional(),
  dimensions: z.object({
    x: z.number().positive(),
    y: z.number().positive(),
    z: z.number().positive(),
  }),
  bounds: z
    .object({
      x: z.number().positive(),
      y: z.number().positive(),
      z: z.number().positive(),
    })
    .optional(),
  qualityTier: z.enum(["placeholder", "draft", "production"]).optional(),
  styleTier: z.enum(["realistic", "stylized"]).optional(),
  materialSlots: z
    .array(
      z.object({
        slotId: z.string().min(1),
        label: z.string().min(1),
        finishId: z.string().min(1),
        finishVariantId: z.string().optional(),
      })
    )
    .optional(),
  provenance: z
    .object({
      source: z.string().min(1),
      license: z.string().min(1),
      author: z.string().optional(),
      url: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
  bimRef: z
    .object({
      source: z.enum(["ifc", "catalog"]),
      externalId: z.string().min(1),
      className: z.string().optional(),
      propertySetKeys: z.array(z.string()).optional(),
    })
    .optional(),
  performanceBudgetKb: z.number().int().positive().optional(),
  keywords: z.array(z.string().min(1)).default([]),
});

type RawBimAsset = z.infer<typeof rawBimAssetSchema>;

function parseArgs(argv: string[]) {
  const args = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith("--")) {
      continue;
    }

    const key = current.slice(2);
    const value = argv[index + 1];
    if (value && !value.startsWith("--")) {
      args.set(key, value);
      index += 1;
    } else {
      args.set(key, "true");
    }
  }

  return args;
}

function getDefaultMaterialSlots(category: FurnitureAssetCategory): CatalogMaterialSlot[] {
  switch (category) {
    case "bathroom":
      return [{ slotId: "primary", label: "Primary finish", finishId: "item-stone", finishVariantId: "travertine" }];
    case "kitchen":
      return [{ slotId: "primary", label: "Primary finish", finishId: "item-stone", finishVariantId: "ash" }];
    case "office":
      return [{ slotId: "primary", label: "Primary finish", finishId: "item-oak", finishVariantId: "smoked" }];
    default:
      return [{ slotId: "primary", label: "Primary finish", finishId: "item-oak", finishVariantId: "natural" }];
  }
}

function normalizeAsset(asset: RawBimAsset) {
  const provenance: AssetProvenance = asset.provenance ?? {
    source: "ifc-import",
    license: "Review required",
  };
  const bimRef: BimReference = asset.bimRef ?? {
    source: "ifc",
    externalId: asset.id,
  };
  const qualityTier: FurnitureAssetQualityTier = asset.qualityTier ?? "draft";
  const styleTier: FurnitureAssetStyleTier = asset.styleTier ?? "realistic";

  return {
    id: asset.id,
    name: asset.name,
    category: asset.category,
    modelUrl: asset.modelUrl,
    previewUrl: asset.previewUrl ?? `/assets/furniture/previews/${asset.id}.png`,
    dimensions: asset.dimensions,
    bounds: asset.bounds ?? asset.dimensions,
    origin: { x: 0.5, y: 0, z: 0.5 },
    qualityTier,
    styleTier,
    materialSlots: asset.materialSlots ?? getDefaultMaterialSlots(asset.category),
    provenance,
    bimRef,
    performanceBudgetKb: asset.performanceBudgetKb ?? 500,
    keywords: Array.from(new Set([asset.name.toLowerCase(), ...asset.keywords.map((keyword) => keyword.toLowerCase())])),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(
    process.cwd(),
    args.get("input") ?? "scripts/bim-assets/source.json"
  );
  const outputPath = path.resolve(
    process.cwd(),
    args.get("output") ?? "client/public/assets/furniture/bim-manifest.generated.json"
  );

  const rawText = await readFile(inputPath, "utf8");
  const rawJson = JSON.parse(rawText) as unknown;
  const rawAssets = z.array(rawBimAssetSchema).parse(rawJson);
  const ids = new Set<string>();

  const normalized = rawAssets
    .map((asset) => normalizeAsset(asset))
    .sort((left, right) => left.id.localeCompare(right.id));

  for (const asset of normalized) {
    if (ids.has(asset.id)) {
      throw new Error(`Duplicate BIM asset id detected: ${asset.id}`);
    }
    ids.add(asset.id);
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");

  console.log(`BIM asset manifest written to ${outputPath}`);
  console.log(`Assets normalized: ${normalized.length}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error("BIM asset sync failed:", message);
  process.exitCode = 1;
});
