import type { CanonicalBim } from "@shared/bim/canonical-schema";

export function getLevelElevationM(bim: CanonicalBim, levelId: string | undefined | null): number {
  if (!levelId) return bim.levels[0]?.elevation ?? 0;
  const lvl = bim.levels.find((l) => l.id === levelId);
  return lvl?.elevation ?? 0;
}

export function getLevelById(bim: CanonicalBim, levelId: string | undefined | null) {
  if (!levelId) return bim.levels[0] ?? null;
  return bim.levels.find((l) => l.id === levelId) ?? bim.levels[0] ?? null;
}
