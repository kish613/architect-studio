import type { CameraPreset as StorePreset } from "@/stores/use-viewer";

export type PresetId = "iso" | "front" | "side" | "top" | "walk";

export const STUDIO_PRESETS: Array<{ id: PresetId; icon: string; label: string }> = [
  { id: "iso",   icon: "box",        label: "Isometric" },
  { id: "front", icon: "square",     label: "Front" },
  { id: "side",  icon: "columns-2",  label: "Side" },
  { id: "top",   icon: "scan",       label: "Top" },
  { id: "walk",  icon: "footprints", label: "Walk" },
];

const MAP: Record<PresetId, NonNullable<StorePreset>> = {
  iso: "isometric",
  front: "front",
  side: "right",
  top: "top",
  walk: "perspective",
};

export function toStorePreset(id: PresetId): NonNullable<StorePreset> {
  return MAP[id];
}
