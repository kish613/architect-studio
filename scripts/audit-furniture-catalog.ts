import { access, readFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FURNITURE_CATALOG, type CatalogItem } from "../shared/furniture-catalog.ts";

type Severity = "error" | "warning";

interface AuditIssue {
  severity: Severity;
  itemId: string;
  message: string;
}

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const ASSET_ROOT = path.join(REPO_ROOT, "client/public/assets/furniture");
const MODEL_DIR = "/assets/furniture/";

const ALLOWED_MODEL_EXTENSIONS = new Set([".glb"]);
const ALLOWED_PREVIEW_EXTENSIONS = new Set([".webp", ".png", ".jpg", ".jpeg"]);

function toFilesystemPath(assetUrl: string): string | null {
  if (!assetUrl.startsWith(MODEL_DIR)) {
    return null;
  }

  const relativePath = assetUrl.slice(1);
  return path.join(REPO_ROOT, "client/public", relativePath);
}

function getExtension(assetUrl: string): string {
  return path.extname(assetUrl).toLowerCase();
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readBuffer(filePath: string): Promise<Buffer | null> {
  try {
    return await readFile(filePath);
  } catch {
    return null;
  }
}

function isValidGlb(buffer: Buffer | null): boolean {
  return Boolean(buffer && buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "glTF");
}

function isValidWebp(header: Buffer | null): boolean {
  return Boolean(
    header &&
      header.length >= 12 &&
      header.toString("ascii", 0, 4) === "RIFF" &&
      header.toString("ascii", 8, 12) === "WEBP"
  );
}

function isValidPng(header: Buffer | null): boolean {
  return Boolean(
    header &&
      header.length >= 8 &&
      header[0] === 0x89 &&
      header.toString("ascii", 1, 4) === "PNG" &&
      header[4] === 0x0d &&
      header[5] === 0x0a &&
      header[6] === 0x1a &&
      header[7] === 0x0a
  );
}

function isValidJpeg(header: Buffer | null): boolean {
  return Boolean(header && header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff);
}

interface ParsedGlb {
  extensionsUsed: string[];
  hasTextures: boolean;
  hasImages: boolean;
}

function parseGlb(buffer: Buffer): ParsedGlb | null {
  if (!isValidGlb(buffer)) {
    return null;
  }

  const version = buffer.readUInt32LE(4);
  if (version !== 2) {
    return null;
  }

  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.readUInt32LE(offset + 4);
    offset += 8;

    if (offset + chunkLength > buffer.length) {
      return null;
    }

    const chunkData = buffer.subarray(offset, offset + chunkLength);
    offset += chunkLength;

    if (chunkType === 0x4e4f534a) {
      try {
        const jsonText = chunkData.toString("utf8").replace(/\u0000+$/g, "");
        const json = JSON.parse(jsonText) as Record<string, unknown>;
        const extensionsUsed = Array.isArray(json.extensionsUsed)
          ? json.extensionsUsed.filter((value): value is string => typeof value === "string")
          : [];
        const hasTextures = Array.isArray(json.textures) && json.textures.length > 0;
        const hasImages = Array.isArray(json.images) && json.images.length > 0;

        return {
          extensionsUsed,
          hasTextures,
          hasImages,
        };
      } catch {
        return null;
      }
    }
  }

  return null;
}

function formatDimensions(item: CatalogItem): string {
  return `${item.dimensions.x} x ${item.dimensions.y} x ${item.dimensions.z}`;
}

function basenameWithoutExtension(assetUrl: string): string {
  return path.basename(assetUrl, path.extname(assetUrl));
}

function addIssue(issues: AuditIssue[], severity: Severity, itemId: string, message: string): void {
  issues.push({ severity, itemId, message });
}

function auditTierMetadata(item: CatalogItem, issues: AuditIssue[]): void {
  const name = item.name.toLowerCase();
  const { x, y, z } = item.dimensions;
  const footprintA = Math.max(x, z);
  const footprintB = Math.min(x, z);
  const ratio = footprintB > 0 ? footprintA / footprintB : Number.POSITIVE_INFINITY;

  if (x <= 0 || y <= 0 || z <= 0) {
    addIssue(issues, "error", item.id, `non-positive dimensions: ${formatDimensions(item)}`);
  }

  if (footprintA > 8 || y > 6) {
    addIssue(issues, "warning", item.id, `dimensions look oversized for a furniture catalog item: ${formatDimensions(item)}`);
  }

  if (name.includes("square") && ratio > 1.25) {
    addIssue(issues, "warning", item.id, `name suggests a square profile, but the footprint ratio is ${ratio.toFixed(2)}: ${formatDimensions(item)}`);
  }

  if ((name.includes("round") || name.includes("circular")) && ratio > 1.15) {
    addIssue(issues, "warning", item.id, `name suggests a round profile, but the footprint ratio is ${ratio.toFixed(2)}: ${formatDimensions(item)}`);
  }

  if (name.includes("wide") && ratio < 1.45) {
    addIssue(issues, "warning", item.id, `name suggests a wide profile, but the footprint ratio is only ${ratio.toFixed(2)}: ${formatDimensions(item)}`);
  }

  if (name.includes("long") && ratio < 1.8) {
    addIssue(issues, "warning", item.id, `name suggests a long profile, but the footprint ratio is only ${ratio.toFixed(2)}: ${formatDimensions(item)}`);
  }

  if ((name.includes("mini") || name.includes("small")) && (footprintA > 1.2 || y > 1.6)) {
    addIssue(issues, "warning", item.id, `name suggests a compact tier, but the dimensions look larger than expected: ${formatDimensions(item)}`);
  }

  if (name.includes("large") && (footprintA < 0.7 || y < 1.0)) {
    addIssue(issues, "warning", item.id, `name suggests a large tier, but the dimensions look smaller than expected: ${formatDimensions(item)}`);
  }
}

function auditCatalogMetadata(item: CatalogItem, issues: AuditIssue[]): void {
  if ((item.materialSlots?.length ?? 0) === 0) {
    addIssue(
      issues,
      item.qualityTier === "production" ? "error" : "warning",
      item.id,
      "catalog entry is missing finish-slot metadata"
    );
  }

  if (!item.provenance?.license || item.provenance.license === "Unspecified") {
    addIssue(
      issues,
      item.qualityTier === "production" ? "error" : "warning",
      item.id,
      "catalog entry is missing clear provenance/license metadata"
    );
  }

  if (!item.provenance?.source) {
    addIssue(issues, "warning", item.id, "catalog entry is missing provenance source metadata");
  }

  if (item.performanceBudgetKb <= 0) {
    addIssue(issues, "error", item.id, `invalid performance budget: ${item.performanceBudgetKb}`);
  }

  if (item.bimRef && !item.bimRef.externalId) {
    addIssue(issues, "error", item.id, "BIM reference is missing externalId");
  }
}

async function auditModelAsset(item: CatalogItem, issues: AuditIssue[]): Promise<void> {
  const modelPath = toFilesystemPath(item.modelUrl);
  if (!modelPath) {
    addIssue(issues, "error", item.id, `modelUrl points outside the furniture asset directory: ${item.modelUrl}`);
    return;
  }

  const modelExt = getExtension(item.modelUrl);
  if (!ALLOWED_MODEL_EXTENSIONS.has(modelExt)) {
    addIssue(issues, "error", item.id, `unsupported model format "${modelExt || "(missing)"}" in ${item.modelUrl}`);
  }

  if (!(await pathExists(modelPath))) {
    addIssue(issues, "error", item.id, `missing model asset: ${modelPath}`);
    return;
  }

  const buffer = await readBuffer(modelPath);
  if (!isValidGlb(buffer)) {
    addIssue(issues, "error", item.id, `model file exists but does not look like a valid GLB: ${modelPath}`);
    return;
  }

  if (buffer) {
    const fileSizeKb = Math.ceil(buffer.length / 1024);
    if (fileSizeKb > item.performanceBudgetKb) {
      addIssue(
        issues,
        item.qualityTier === "production" ? "error" : "warning",
        item.id,
        `GLB is ${fileSizeKb}KB, above its ${item.performanceBudgetKb}KB performance budget`
      );
    }
  }

  const expectedAssetId = basenameWithoutExtension(item.modelUrl);
  if (expectedAssetId !== item.id) {
    addIssue(
      issues,
      "warning",
      item.id,
      `model asset is reused from "${expectedAssetId}.glb" instead of a one-to-one "${item.id}.glb" asset`
    );
  }

  if (!buffer) {
    return;
  }

  const parsed = parseGlb(buffer);
  if (!parsed) {
    addIssue(issues, "error", item.id, `model file exists but its GLB JSON chunk could not be parsed: ${modelPath}`);
    return;
  }

  if (parsed.extensionsUsed.includes("KHR_materials_unlit")) {
    addIssue(
      issues,
      item.qualityTier === "production" ? "error" : "warning",
      item.id,
      "GLB uses KHR_materials_unlit, so the model will render as an unlit placeholder"
    );
  }

  if (!parsed.hasTextures || !parsed.hasImages) {
    addIssue(
      issues,
      item.qualityTier === "production" ? "error" : "warning",
      item.id,
      "GLB is missing texture/image references, which usually means the model is still at placeholder-material quality"
    );
  }
}

async function auditPreviewAsset(item: CatalogItem, issues: AuditIssue[]): Promise<void> {
  if (!item.thumbnailUrl) {
    addIssue(issues, "error", item.id, "missing preview manifest entry");
    return;
  }

  const previewPath = toFilesystemPath(item.thumbnailUrl);
  if (!previewPath) {
    addIssue(issues, "error", item.id, `thumbnailUrl points outside the furniture asset directory: ${item.thumbnailUrl}`);
    return;
  }

  const previewExt = getExtension(item.thumbnailUrl);
  if (!ALLOWED_PREVIEW_EXTENSIONS.has(previewExt)) {
    addIssue(issues, "error", item.id, `unsupported preview format "${previewExt || "(missing)"}" in ${item.thumbnailUrl}`);
  }

  if (!(await pathExists(previewPath))) {
    addIssue(issues, "error", item.id, `missing preview asset: ${previewPath}`);
    return;
  }

  const header = await readBuffer(previewPath);
  const isValidPreview =
    (previewExt === ".webp" && isValidWebp(header)) ||
    (previewExt === ".png" && isValidPng(header)) ||
    ((previewExt === ".jpg" || previewExt === ".jpeg") && isValidJpeg(header));

  if (!isValidPreview) {
    addIssue(issues, "error", item.id, `preview file exists but does not match its declared image format: ${previewPath}`);
  }
}

async function main(): Promise<void> {
  const issues: AuditIssue[] = [];
  const seenIds = new Set<string>();

  for (const item of FURNITURE_CATALOG) {
    if (seenIds.has(item.id)) {
      addIssue(issues, "error", item.id, `duplicate catalog id detected: ${item.id}`);
      continue;
    }
    seenIds.add(item.id);

    await auditModelAsset(item, issues);
    await auditPreviewAsset(item, issues);
    auditTierMetadata(item, issues);
    auditCatalogMetadata(item, issues);
  }

  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;

  console.log(`Furniture catalog audit: ${FURNITURE_CATALOG.length} items checked`);
  console.log(`Assets root: ${ASSET_ROOT}`);

  if (issues.length === 0) {
    console.log("No asset issues found.");
    return;
  }

  const grouped = {
    errors: issues.filter((issue) => issue.severity === "error"),
    warnings: issues.filter((issue) => issue.severity === "warning"),
  };

  if (grouped.errors.length > 0) {
    console.log("\nErrors:");
    for (const issue of grouped.errors) {
      console.log(`- [${issue.itemId}] ${issue.message}`);
    }
  }

  if (grouped.warnings.length > 0) {
    console.log("\nWarnings:");
    for (const issue of grouped.warnings) {
      console.log(`- [${issue.itemId}] ${issue.message}`);
    }
  }

  console.log(`\nSummary: ${errorCount} error(s), ${warningCount} warning(s)`);

  if (errorCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error("Furniture catalog audit failed:", message);
  process.exitCode = 1;
});
