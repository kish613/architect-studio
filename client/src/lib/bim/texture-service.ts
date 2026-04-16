/**
 * PBR Texture Service — fetches texture sets from ambientCG (CC0)
 * with two-tier caching (Browser Cache API + in-memory LRU).
 *
 * Design:
 * - Primary: ambientCG API fetch for real PBR texture maps
 * - Fallback: system works without textures (procedural materials)
 * - Progressive: textures load async, listeners notified on ready
 */

import * as THREE from "three";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface PbrTextureSet {
  albedo: THREE.Texture | null;
  normal: THREE.Texture | null;
  roughness: THREE.Texture | null;
  ao: THREE.Texture | null;
}

type MapSuffix = "Color" | "NormalGL" | "Roughness" | "AmbientOcclusion";

const MAP_SUFFIXES: Record<keyof PbrTextureSet, MapSuffix> = {
  albedo: "Color",
  normal: "NormalGL",
  roughness: "Roughness",
  ao: "AmbientOcclusion",
};

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const CACHE_NAME = "archstudio-textures-v1";
const MAX_MEMORY_ENTRIES = 40;
const DEFAULT_RESOLUTION: TextureResolution = "1K";

export type TextureResolution = "1K" | "2K";

// ─────────────────────────────────────────────────────────────
// In-memory LRU cache
// ─────────────────────────────────────────────────────────────

interface CacheEntry {
  textureSet: PbrTextureSet;
  lastAccess: number;
}

const memoryCache = new Map<string, CacheEntry>();

function memoryGet(key: string): PbrTextureSet | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  entry.lastAccess = Date.now();
  return entry.textureSet;
}

function memoryPut(key: string, textureSet: PbrTextureSet): void {
  if (memoryCache.size >= MAX_MEMORY_ENTRIES) {
    // Evict least-recently-accessed
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [k, v] of memoryCache) {
      if (v.lastAccess < oldestTime) {
        oldestTime = v.lastAccess;
        oldestKey = k;
      }
    }
    if (oldestKey) {
      const evicted = memoryCache.get(oldestKey);
      if (evicted) {
        disposeTextureSet(evicted.textureSet);
      }
      memoryCache.delete(oldestKey);
    }
  }
  memoryCache.set(key, { textureSet, lastAccess: Date.now() });
}

function disposeTextureSet(ts: PbrTextureSet): void {
  ts.albedo?.dispose();
  ts.normal?.dispose();
  ts.roughness?.dispose();
  ts.ao?.dispose();
}

// ─────────────────────────────────────────────────────────────
// Event system
// ─────────────────────────────────────────────────────────────

type TextureReadyCallback = (id: string) => void;
const listeners = new Set<TextureReadyCallback>();

function notifyReady(id: string): void {
  for (const cb of listeners) {
    try {
      cb(id);
    } catch {
      // Swallow listener errors
    }
  }
}

/**
 * Subscribe to texture-ready events. Returns unsubscribe function.
 */
export function onTextureReady(callback: TextureReadyCallback): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

// ─────────────────────────────────────────────────────────────
// In-flight dedup
// ─────────────────────────────────────────────────────────────

const inFlight = new Map<string, Promise<PbrTextureSet>>();

// ─────────────────────────────────────────────────────────────
// Browser Cache API helpers
// ─────────────────────────────────────────────────────────────

async function openCache(): Promise<Cache | null> {
  try {
    if (typeof caches === "undefined") return null;
    return await caches.open(CACHE_NAME);
  } catch {
    return null;
  }
}

async function getCachedBlob(cache: Cache, url: string): Promise<Blob | null> {
  try {
    const resp = await cache.match(url);
    if (!resp) return null;
    return await resp.blob();
  } catch {
    return null;
  }
}

async function putCachedBlob(cache: Cache, url: string, blob: Blob): Promise<void> {
  try {
    const resp = new Response(blob, {
      headers: { "Content-Type": blob.type || "image/jpeg" },
    });
    await cache.put(url, resp);
  } catch {
    // Silently fail — cache is optional
  }
}

// ─────────────────────────────────────────────────────────────
// Texture loading
// ─────────────────────────────────────────────────────────────

const textureLoader = new THREE.TextureLoader();

function configureTexture(
  texture: THREE.Texture,
  mapType: keyof PbrTextureSet,
): void {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace =
    mapType === "albedo" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
}

// NOTE: ambientCG does not serve individual texture files via a stable public
// URL pattern — their /get endpoint returns ZIP archives, not JPEGs. Attempts
// to construct per-map URLs result in HTML error pages. Fetching and unzipping
// client-side would require a JSZip-style dependency. For now we rely entirely
// on whatever map URLs the API provides; if the response lacks them (typical),
// texture loading is skipped and the procedural fallback in bim-finish-resolver
// handles the material appearance.

async function loadTextureFromUrl(
  url: string,
  mapType: keyof PbrTextureSet,
  cache: Cache | null,
): Promise<THREE.Texture | null> {
  try {
    // Try browser cache first
    let blobUrl: string | null = null;
    if (cache) {
      const blob = await getCachedBlob(cache, url);
      if (blob) {
        blobUrl = URL.createObjectURL(blob);
      }
    }

    const loadUrl = blobUrl || url;

    const texture = await new Promise<THREE.Texture>((resolve, reject) => {
      textureLoader.load(
        loadUrl,
        (tex) => resolve(tex),
        undefined,
        (err) => reject(err),
      );
    });

    configureTexture(texture, mapType);

    // If we loaded from network, cache the blob
    if (!blobUrl && cache) {
      try {
        const resp = await fetch(url);
        if (resp.ok) {
          const blob = await resp.blob();
          await putCachedBlob(cache, url, blob);
        }
      } catch {
        // Cache miss is fine
      }
    }

    // Clean up blob URL if used
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
    }

    return texture;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// AmbientCG API-based fetching
// ─────────────────────────────────────────────────────────────

interface AmbientCgDownloadData {
  [resolution: string]: {
    rawDownloads?: Record<string, string>;
    filePath?: string;
  };
}

interface AmbientCgApiResponse {
  foundAssets?: Array<{
    assetId: string;
    downloadFolders?: {
      default?: {
        downloadFiletypeCategories?: {
          jpg?: {
            downloads?: Array<{
              attribute: string;
              downloadLink?: string;
              fileName?: string;
              filetype?: string;
              rawDownloadLink?: string;
              zipContent?: Array<{
                fileName: string;
                downloadLink?: string;
              }>;
            }>;
          };
        };
      };
    };
  }>;
}

/**
 * Try to extract individual texture map URLs from the ambientCG API response.
 */
function extractMapUrlsFromApi(
  response: AmbientCgApiResponse,
  id: string,
  resolution: TextureResolution,
): Record<MapSuffix, string> | null {
  try {
    const asset = response.foundAssets?.[0];
    if (!asset) return null;

    const jpgDownloads =
      asset.downloadFolders?.default?.downloadFiletypeCategories?.jpg?.downloads;
    if (!jpgDownloads) return null;

    // Find the right resolution download
    const resDl = jpgDownloads.find(
      (d) => d.attribute === resolution && d.filetype === "jpg",
    );
    if (!resDl?.zipContent) return null;

    const urls: Partial<Record<MapSuffix, string>> = {};
    for (const file of resDl.zipContent) {
      for (const [, suffix] of Object.entries(MAP_SUFFIXES)) {
        if (file.fileName.includes(`_${suffix}.`) && file.downloadLink) {
          urls[suffix] = file.downloadLink;
        }
      }
    }

    // Check we got at least the albedo
    if (!urls.Color) return null;
    return urls as Record<MapSuffix, string>;
  } catch {
    return null;
  }
}

/**
 * Fetch PBR texture set from ambientCG by asset ID.
 * Falls back gracefully — returns null maps if network fails.
 */
async function fetchFromAmbientCg(
  id: string,
  resolution: TextureResolution,
): Promise<PbrTextureSet> {
  const cache = await openCache();
  const emptySet: PbrTextureSet = {
    albedo: null,
    normal: null,
    roughness: null,
    ao: null,
  };

  // Step 1: Try the API to get exact download URLs
  let mapUrls: Record<MapSuffix, string> | null = null;

  try {
    const apiUrl = `https://ambientcg.com/api/v2/full_json?id=${id}&type=Material&include=downloadData`;
    const resp = await fetch(apiUrl, { signal: AbortSignal.timeout(8000) });
    if (resp.ok) {
      const data = (await resp.json()) as AmbientCgApiResponse;
      mapUrls = extractMapUrlsFromApi(data, id, resolution);
    }
  } catch {
    // API failed — try direct URL pattern below
  }

  // Step 2: If API didn't surface individual map URLs, we cannot load
  // textures (ambientCG only serves ZIPs via /get). Return empty set and
  // let the material system use its procedural fallback.
  if (!mapUrls) {
    return emptySet;
  }

  // Step 3: Load each texture map in parallel
  const results = await Promise.allSettled([
    loadTextureFromUrl(mapUrls.Color, "albedo", cache),
    loadTextureFromUrl(mapUrls.NormalGL, "normal", cache),
    loadTextureFromUrl(mapUrls.Roughness, "roughness", cache),
    loadTextureFromUrl(mapUrls.AmbientOcclusion, "ao", cache),
  ]);

  const textureSet: PbrTextureSet = {
    albedo:
      results[0].status === "fulfilled" ? results[0].value : null,
    normal:
      results[1].status === "fulfilled" ? results[1].value : null,
    roughness:
      results[2].status === "fulfilled" ? results[2].value : null,
    ao:
      results[3].status === "fulfilled" ? results[3].value : null,
  };

  // If we got at least the albedo, consider it a success
  if (!textureSet.albedo) {
    return emptySet;
  }

  return textureSet;
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Fetch a full PBR texture set for an ambientCG asset ID.
 * Uses two-tier caching: in-memory LRU + Browser Cache API.
 * Deduplicates in-flight requests.
 */
export async function fetchPbrTextureSet(
  ambientCgId: string,
  resolution: TextureResolution = DEFAULT_RESOLUTION,
): Promise<PbrTextureSet> {
  const cacheKey = `${ambientCgId}_${resolution}`;

  // Tier 1: In-memory
  const memHit = memoryGet(cacheKey);
  if (memHit) return memHit;

  // Dedup in-flight
  const existing = inFlight.get(cacheKey);
  if (existing) return existing;

  const promise = fetchFromAmbientCg(ambientCgId, resolution)
    .then((ts) => {
      memoryPut(cacheKey, ts);
      inFlight.delete(cacheKey);
      notifyReady(ambientCgId);
      return ts;
    })
    .catch(() => {
      inFlight.delete(cacheKey);
      const empty: PbrTextureSet = {
        albedo: null,
        normal: null,
        roughness: null,
        ao: null,
      };
      return empty;
    });

  inFlight.set(cacheKey, promise);
  return promise;
}

/**
 * Synchronous in-memory cache lookup. Returns null if not cached.
 * Use this in render paths where async is not possible.
 */
export function getTextureSetSync(
  ambientCgId: string,
  resolution: TextureResolution = DEFAULT_RESOLUTION,
): PbrTextureSet | null {
  const cacheKey = `${ambientCgId}_${resolution}`;
  return memoryGet(cacheKey);
}

/**
 * Fire-and-forget prefetch. Ensures the texture set will be
 * available via getTextureSetSync() once loaded.
 */
export function prefetchTextureSet(
  ambientCgId: string,
  resolution: TextureResolution = DEFAULT_RESOLUTION,
): void {
  // Only prefetch if not already cached or in-flight
  const cacheKey = `${ambientCgId}_${resolution}`;
  if (memoryGet(cacheKey) || inFlight.has(cacheKey)) return;
  fetchPbrTextureSet(ambientCgId, resolution).catch(() => {
    // Swallow — prefetch is best-effort
  });
}

/**
 * Apply a PBR texture set to a THREE.MeshPhysicalMaterial's properties.
 * Returns the material property overrides to spread into the constructor.
 */
export function applyPbrTextures(
  textureSet: PbrTextureSet,
  repeat?: { x: number; y: number },
): Partial<THREE.MeshPhysicalMaterialParameters> {
  const props: Partial<THREE.MeshPhysicalMaterialParameters> = {};

  if (textureSet.albedo) {
    if (repeat) {
      textureSet.albedo.repeat.set(repeat.x, repeat.y);
    }
    props.map = textureSet.albedo;
  }

  if (textureSet.normal) {
    if (repeat) {
      textureSet.normal.repeat.set(repeat.x, repeat.y);
    }
    props.normalMap = textureSet.normal;
    props.normalScale = new THREE.Vector2(0.8, 0.8);
  }

  if (textureSet.roughness) {
    if (repeat) {
      textureSet.roughness.repeat.set(repeat.x, repeat.y);
    }
    props.roughnessMap = textureSet.roughness;
  }

  if (textureSet.ao) {
    if (repeat) {
      textureSet.ao.repeat.set(repeat.x, repeat.y);
    }
    props.aoMap = textureSet.ao;
    props.aoMapIntensity = 1.0;
  }

  return props;
}
