export interface Selection {
  buildingId: string | null;
  levelId: string | null;
  zoneId?: string | null;
  selectedIds: string[];
}

export type CameraMode = "perspective" | "orthographic";
export type LevelMode = "stacked" | "exploded" | "solo";
export type WallMode = "up" | "cutaway" | "down";
export type Theme = "dark" | "light";
