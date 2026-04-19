import type { WallMode } from "@/stores/use-viewer";

export function cutYToWallMode(y: number): WallMode {
  if (y < 1 / 3) return "up";
  if (y < 2 / 3) return "cutaway";
  return "down";
}

export function wallModeToCutY(m: WallMode): number {
  return m === "up" ? 0 : m === "cutaway" ? 0.5 : 1;
}
