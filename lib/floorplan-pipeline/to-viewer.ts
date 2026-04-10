/**
 * Pipeline stage 5: viewer payload derivation.
 *
 * Takes a canonical BIM model and produces lightweight, viewer-friendly
 * payloads. These are intended to be consumed by the BIM viewer and the
 * presentation viewer on the client without re-running the extractor.
 *
 * NOTE: Full IFC / GLB / Fragments generation is a separate, heavier
 * pipeline (and is scaffolded in `lib/floorplan-pipeline/derived-assets.ts`
 * as a placeholder for the serverless path). This module only emits the
 * JSON summary bundles that the client viewers can immediately use while
 * those heavier asset builds are wired in.
 */

import {
  computeBimBounds,
  type CanonicalBim,
} from "../../shared/bim/canonical-schema.js";

/**
 * Compact, per-element summary the BIM viewer can use to build an
 * object-metadata panel, layer toggles, and measurement hooks.
 */
export interface BimViewerPayload {
  /** BIM metadata surfaced to the viewer. */
  metadata: CanonicalBim["metadata"];
  /** Bounding box of the scene in world metres. */
  bounds: ReturnType<typeof computeBimBounds>;
  /** Per-level summaries (floor index, room count, etc.). */
  levels: Array<{
    id: string;
    name?: string;
    index: number;
    elevation: number;
    height: number;
    wallCount: number;
    roomCount: number;
    doorCount: number;
    windowCount: number;
  }>;
  /** Room metadata (already flattened for the BIM object panel). */
  rooms: Array<{
    id: string;
    levelId?: string;
    name?: string;
    roomType: string;
    areaSqm: number;
  }>;
  /** Wall metadata (length, exterior flag, level ref). */
  walls: Array<{
    id: string;
    levelId?: string;
    length: number;
    isExterior: boolean;
    isLoadBearing: boolean;
  }>;
  /** Total counts for quick chips in the header. */
  totals: {
    levels: number;
    walls: number;
    doors: number;
    windows: number;
    rooms: number;
    furniture: number;
    fixtures: number;
  };
}

function polygonArea(points: { x: number; z: number }[]): number {
  if (points.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.z - b.x * a.z;
  }
  return Math.abs(sum) / 2;
}

function wallLength(w: CanonicalBim["walls"][number]): number {
  return Math.hypot(w.end.x - w.start.x, w.end.z - w.start.z);
}

export function toBimViewerPayload(bim: CanonicalBim): BimViewerPayload {
  const bounds = computeBimBounds(bim);

  const levels = bim.levels.map((lvl) => ({
    id: lvl.id,
    name: lvl.name,
    index: lvl.index,
    elevation: lvl.elevation,
    height: lvl.height,
    wallCount: bim.walls.filter((w) => w.levelId === lvl.id).length,
    roomCount: bim.rooms.filter((r) => r.levelId === lvl.id).length,
    doorCount: bim.doors.filter((d) => d.levelId === lvl.id).length,
    windowCount: bim.windows.filter((w) => w.levelId === lvl.id).length,
  }));

  const rooms = bim.rooms.map((r) => ({
    id: r.id,
    levelId: r.levelId,
    name: r.name ?? r.label,
    roomType: r.roomType,
    areaSqm: polygonArea(r.outline),
  }));

  const walls = bim.walls.map((w) => ({
    id: w.id,
    levelId: w.levelId,
    length: wallLength(w),
    isExterior: w.isExterior,
    isLoadBearing: w.isLoadBearing,
  }));

  return {
    metadata: bim.metadata,
    bounds,
    levels,
    rooms,
    walls,
    totals: {
      levels: bim.levels.length,
      walls: bim.walls.length,
      doors: bim.doors.length,
      windows: bim.windows.length,
      rooms: bim.rooms.length,
      furniture: bim.furniture.length,
      fixtures: bim.fixtures.length,
    },
  };
}

/**
 * Presentation viewer payload — a smaller, renderer-agnostic bundle the
 * client-facing 3D view can use without needing to process the full BIM.
 *
 * The actual 3D materialisation happens on the client inside the
 * presentation viewer component; this payload is just the cleaned-up
 * geometry plus material hints.
 */
export interface PresentationViewerPayload {
  metadata: CanonicalBim["metadata"];
  bounds: ReturnType<typeof computeBimBounds>;
  walls: Array<{
    id: string;
    start: { x: number; z: number };
    end: { x: number; z: number };
    height: number;
    thickness: number;
  }>;
  slabs: Array<{
    id: string;
    outline: Array<{ x: number; z: number }>;
    thickness: number;
  }>;
  rooms: Array<{
    id: string;
    label?: string;
    roomType: string;
    outline: Array<{ x: number; z: number }>;
  }>;
}

export function toPresentationPayload(
  bim: CanonicalBim
): PresentationViewerPayload {
  return {
    metadata: bim.metadata,
    bounds: computeBimBounds(bim),
    walls: bim.walls.map((w) => ({
      id: w.id,
      start: w.start,
      end: w.end,
      height: w.height,
      thickness: w.thickness,
    })),
    slabs: bim.slabs.map((s) => ({
      id: s.id,
      outline: s.outline,
      thickness: s.thickness,
    })),
    rooms: bim.rooms.map((r) => ({
      id: r.id,
      label: r.label,
      roomType: r.roomType,
      outline: r.outline,
    })),
  };
}
