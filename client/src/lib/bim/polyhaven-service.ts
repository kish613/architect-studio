/**
 * Poly Haven API client for fetching 3D models.
 *
 * Poly Haven serves models in glTF format (JSON + external .bin + external
 * texture JPEGs), NOT self-contained GLB. This means we CANNOT cache the
 * top-level .gltf file as a single blob — the relative paths inside it
 * (e.g. "textures/Armchair_01_diff_1k.jpg") must be resolved against the
 * original CDN URL so THREE.GLTFLoader can follow them.
 *
 * Approach:
 *   1. Fetch the model list and per-model file manifests from api.polyhaven.com
 *   2. Resolve the direct CDN URL of the top-level .gltf file
 *   3. Hand that URL to `useGLTF` / THREE.GLTFLoader, which will fetch
 *      all dependent resources from the same CDN (CORS allows it).
 *   4. drei's useGLTF maintains its own in-session cache, so repeated loads
 *      of the same URL are free.
 *
 * API docs: https://polyhaven.com/api
 */

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface PolyHavenModel {
  id: string;
  name: string;
  categories: string[];
  tags: string[];
  thumbnailUrl: string;
}

interface PolyHavenAssetListEntry {
  name: string;
  categories: string[];
  tags: string[];
  date_published: number;
}

type PolyHavenAssetList = Record<string, PolyHavenAssetListEntry>;

interface PolyHavenFilesResponse {
  gltf?: Record<
    string,
    {
      gltf?: { url: string; size: number };
    }
  >;
  [key: string]: unknown;
}

export type PolyHavenResolution = "1k" | "2k" | "4k";

// ─────────────────────────────────────────────────────────────
// Category mapping (Poly Haven tag → app category)
// ─────────────────────────────────────────────────────────────

export const POLYHAVEN_CATEGORY_MAP: Record<string, string> = {
  chair: "living",
  sofa: "living",
  couch: "living",
  armchair: "living",
  table: "living",
  "coffee table": "living",
  shelf: "living",
  bookshelf: "living",
  bed: "bedroom",
  nightstand: "bedroom",
  wardrobe: "bedroom",
  dresser: "bedroom",
  desk: "office",
  "office chair": "office",
  monitor: "office",
  sink: "bathroom",
  toilet: "bathroom",
  bathtub: "bathroom",
  oven: "kitchen",
  fridge: "kitchen",
  microwave: "kitchen",
  lamp: "decor",
  vase: "decor",
  plant: "decor",
  rug: "decor",
  outdoor: "outdoor",
  bench: "outdoor",
};

// ─────────────────────────────────────────────────────────────
// In-memory caches (session-scoped)
// ─────────────────────────────────────────────────────────────

let _cachedModels: PolyHavenModel[] | null = null;
const _filesCache = new Map<string, PolyHavenFilesResponse>();
const _urlCache = new Map<string, string>(); // key: `${id}:${resolution}` → gltf URL

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function thumbnailUrl(id: string): string {
  return `https://cdn.polyhaven.com/asset_img/thumbs/${id}.png?height=200`;
}

/**
 * Resolve a Poly Haven tag/category list to one of our app categories.
 * Falls back to "decor" if nothing matches.
 */
function resolveCategory(categories: string[], tags: string[]): string {
  const all = [...categories, ...tags].map((t) => t.toLowerCase());
  for (const t of all) {
    if (POLYHAVEN_CATEGORY_MAP[t]) return POLYHAVEN_CATEGORY_MAP[t];
  }
  // Partial matches — check if any tag *contains* a keyword
  for (const t of all) {
    for (const [keyword, cat] of Object.entries(POLYHAVEN_CATEGORY_MAP)) {
      if (t.includes(keyword)) return cat;
    }
  }
  return "decor";
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Fetch the full list of Poly Haven 3D models.
 * Results are cached in memory for the session after the first successful call.
 */
export async function fetchPolyHavenModels(): Promise<PolyHavenModel[]> {
  if (_cachedModels) return _cachedModels;

  try {
    const response = await fetch(
      "https://api.polyhaven.com/assets?type=models",
    );
    if (!response.ok) {
      console.warn(
        `[PolyHaven] Asset list fetch failed: ${response.status}`,
      );
      return [];
    }
    const data: PolyHavenAssetList = await response.json();

    const models: PolyHavenModel[] = Object.entries(data).map(
      ([id, entry]) => ({
        id,
        name: entry.name,
        categories: entry.categories ?? [],
        tags: entry.tags ?? [],
        thumbnailUrl: thumbnailUrl(id),
      }),
    );

    _cachedModels = models;
    return models;
  } catch (err) {
    console.warn("[PolyHaven] Failed to fetch model list:", err);
    return [];
  }
}

/**
 * Fetch the file manifest for a single Poly Haven model. Cached in memory.
 */
async function fetchModelFiles(
  id: string,
): Promise<PolyHavenFilesResponse | null> {
  if (_filesCache.has(id)) return _filesCache.get(id)!;

  try {
    const response = await fetch(`https://api.polyhaven.com/files/${id}`);
    if (!response.ok) {
      console.warn(
        `[PolyHaven] Files fetch failed for ${id}: ${response.status}`,
      );
      return null;
    }
    const data: PolyHavenFilesResponse = await response.json();
    _filesCache.set(id, data);
    return data;
  } catch (err) {
    console.warn(`[PolyHaven] Failed to fetch files for ${id}:`, err);
    return null;
  }
}

/**
 * Resolve the direct CDN URL for a Poly Haven model's .gltf file at the
 * requested resolution. The returned URL is suitable for passing directly
 * to `useGLTF` / THREE.GLTFLoader — the loader will fetch all dependent
 * .bin and texture files from the same CDN.
 *
 * Returns null if the model or resolution isn't available.
 */
export async function getPolyHavenGltfUrl(
  id: string,
  resolution: PolyHavenResolution = "1k",
): Promise<string | null> {
  const cacheKey = `${id}:${resolution}`;
  const cached = _urlCache.get(cacheKey);
  if (cached) return cached;

  const files = await fetchModelFiles(id);
  if (!files) return null;

  const gltfMap = files.gltf ?? {};
  // Prefer the requested resolution; fall back through 1k → 2k → 4k
  const tryOrder: PolyHavenResolution[] =
    resolution === "1k"
      ? ["1k", "2k", "4k"]
      : resolution === "2k"
        ? ["2k", "1k", "4k"]
        : ["4k", "2k", "1k"];

  for (const r of tryOrder) {
    const url = gltfMap[r]?.gltf?.url;
    if (url) {
      _urlCache.set(cacheKey, url);
      return url;
    }
  }
  return null;
}

/**
 * Map Poly Haven categories/tags to our app category string.
 */
export { resolveCategory as resolvePolyHavenCategory };
