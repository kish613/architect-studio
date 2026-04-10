/**
 * Pipeline stage 3: validate.
 *
 * Validates a canonical BIM model and performs cheap, non-destructive
 * auto-repairs — removing orphan openings, clamping obviously-bad numeric
 * values, and producing human-readable diagnostics.
 *
 * This stage must NEVER silently drop meaningful structure. If something is
 * rescued or removed, it appears in the returned diagnostics array so the
 * extract/review view can surface it to the user.
 */

import {
  canonicalBimSchema,
  type CanonicalBim,
} from "../../shared/bim/canonical-schema.js";
import type { PipelineDiagnostic } from "./types.js";

export interface ValidateResult {
  bim: CanonicalBim;
  diagnostics: PipelineDiagnostic[];
}

export function validateCanonicalBim(bim: CanonicalBim): ValidateResult {
  const diagnostics: PipelineDiagnostic[] = [];

  // 1. Schema pass — if the BIM has slipped out of schema, surface loudly
  //    but also make a best-effort coerce through the schema parser.
  const schemaCheck = canonicalBimSchema.safeParse(bim);
  let working: CanonicalBim;
  if (!schemaCheck.success) {
    diagnostics.push({
      stage: "validate",
      code: "schema-violation",
      message: `Canonical BIM failed schema validation: ${schemaCheck.error.message}`,
    });
    working = canonicalBimSchema.parse({ ...bim });
  } else {
    working = schemaCheck.data;
  }

  // 2. Build a wall-ID index so we can resolve host references.
  const wallIds = new Set(working.walls.map((w) => w.id));

  // 3. Remove doors/windows that reference missing walls.
  const filteredDoors = working.doors.filter((d) => {
    if (wallIds.has(d.hostWallId)) return true;
    diagnostics.push({
      stage: "validate",
      code: "orphan-door",
      message: `Door "${d.name ?? d.id}" referenced missing wall — removed.`,
    });
    return false;
  });

  const filteredWindows = working.windows.filter((w) => {
    if (wallIds.has(w.hostWallId)) return true;
    diagnostics.push({
      stage: "validate",
      code: "orphan-window",
      message: `Window "${w.name ?? w.id}" referenced missing wall — removed.`,
    });
    return false;
  });

  // 4. Clamp openings to [0, 1] and make sure widths do not exceed the host
  //    wall length. We do not fail — we just clamp + warn.
  const wallById = new Map(working.walls.map((w) => [w.id, w]));
  const safeDoors = filteredDoors.map((door) => {
    const host = wallById.get(door.hostWallId);
    if (!host) return door;
    const dx = host.end.x - host.start.x;
    const dz = host.end.z - host.start.z;
    const wallLen = Math.hypot(dx, dz);
    if (wallLen <= 0) return door;
    if (door.width > wallLen * 0.9) {
      diagnostics.push({
        stage: "validate",
        code: "door-too-wide",
        message: `Door "${door.name ?? door.id}" wider than host wall — clamped.`,
      });
      return { ...door, width: Math.max(0.6, wallLen * 0.8) };
    }
    return door;
  });

  const safeWindows = filteredWindows.map((win) => {
    const host = wallById.get(win.hostWallId);
    if (!host) return win;
    const dx = host.end.x - host.start.x;
    const dz = host.end.z - host.start.z;
    const wallLen = Math.hypot(dx, dz);
    if (wallLen <= 0) return win;
    if (win.width > wallLen * 0.95) {
      diagnostics.push({
        stage: "validate",
        code: "window-too-wide",
        message: `Window "${win.name ?? win.id}" wider than host wall — clamped.`,
      });
      return { ...win, width: Math.max(0.4, wallLen * 0.8) };
    }
    return win;
  });

  // 5. Ensure we have at least one level so downstream code never chokes.
  let levels = working.levels;
  if (levels.length === 0) {
    levels = [
      {
        id: "level-ground",
        name: "Ground Floor",
        index: 0,
        elevation: 0,
        height: 2.7,
        tags: [],
      },
    ];
    diagnostics.push({
      stage: "validate",
      code: "no-levels",
      message: "Canonical BIM had no levels — added a default Ground Floor.",
    });
  }

  const result: CanonicalBim = {
    ...working,
    levels,
    doors: safeDoors,
    windows: safeWindows,
  };

  return { bim: result, diagnostics };
}
