/**
 * HDRI pre-caching service.
 *
 * drei's `<Environment files={url} />` handles .hdr loading internally via
 * RGBELoader.  This service provides an optional pre-fetch layer so that
 * switching presets feels instant after the first load — the browser cache
 * will serve the blob on the second request.
 *
 * Usage is entirely optional; the viewer works without calling `preloadHdri`.
 */

const hdriCache = new Map<string, string>();

/**
 * Pre-fetch an .hdr file and store a blob-URL in memory.
 * Subsequent calls with the same URL are no-ops.
 */
export async function preloadHdri(url: string): Promise<void> {
  if (hdriCache.has(url)) return;
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HDRI fetch ${resp.status}`);
    const blob = await resp.blob();
    hdriCache.set(url, URL.createObjectURL(blob));
  } catch (err) {
    // Silently swallow — the viewer will fall back to the drei preset.
    console.warn("[hdri-service] preload failed, will use fallback:", err);
  }
}

/**
 * Return a cached blob-URL for the given HDRI, or `null` if not yet cached.
 */
export function getCachedHdriUrl(url: string): string | null {
  return hdriCache.get(url) ?? null;
}
