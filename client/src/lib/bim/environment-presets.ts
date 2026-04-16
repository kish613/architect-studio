/**
 * Environment presets for the BIM 3D viewer.
 *
 * Each preset bundles HDRI URLs, sun/fill/ambient lighting, hemisphere,
 * environment map intensity, tone-mapping exposure, and shadow parameters.
 * The viewer reads the active preset from the Zustand store and applies
 * every value declaratively via React Three Fiber props.
 */

export interface EnvironmentPreset {
  id: string;
  label: string;
  /** Lucide icon name used by the picker UI */
  icon: string;
  // --- HDRI ---
  /** 1K .hdr URL (Poly Haven or similar CDN) */
  hdriUrl: string;
  // --- Sun (primary directional light) ---
  sunPosition: [number, number, number];
  sunIntensity: number;
  sunColor: string;
  // --- Fill (secondary directional light) ---
  fillPosition: [number, number, number];
  fillIntensity: number;
  fillColor: string;
  // --- Ambient ---
  ambientIntensity: number;
  // --- Hemisphere ---
  hemisphereTopColor: string;
  hemisphereBottomColor: string;
  hemisphereIntensity: number;
  // --- Environment map ---
  envIntensity: number;
  // --- Tone mapping ---
  toneMappingExposure: number;
  // --- Shadows ---
  contactShadowOpacity: number;
  shadowBias: number;
}

export const ENVIRONMENT_PRESETS: Record<string, EnvironmentPreset> = {
  daylight: {
    id: "daylight",
    label: "Daylight",
    icon: "Sun",
    hdriUrl:
      "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kloppenheim_05_puresky_1k.hdr",
    sunPosition: [10, 25, 15],
    sunIntensity: 1.8,
    sunColor: "#fff5e6",
    fillPosition: [-8, 10, -6],
    fillIntensity: 0.5,
    fillColor: "#e6f0ff",
    ambientIntensity: 0.4,
    hemisphereTopColor: "#87ceeb",
    hemisphereBottomColor: "#b08d57",
    hemisphereIntensity: 0.4,
    envIntensity: 0.8,
    toneMappingExposure: 1.0,
    contactShadowOpacity: 0.35,
    shadowBias: -0.0001,
  },
  golden_hour: {
    id: "golden_hour",
    label: "Golden Hour",
    icon: "Sunset",
    hdriUrl:
      "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/golden_bay_1k.hdr",
    sunPosition: [20, 6, 10],
    sunIntensity: 2.2,
    sunColor: "#ff9944",
    fillPosition: [-10, 12, -8],
    fillIntensity: 0.3,
    fillColor: "#6688bb",
    ambientIntensity: 0.3,
    hemisphereTopColor: "#ff8844",
    hemisphereBottomColor: "#553322",
    hemisphereIntensity: 0.35,
    envIntensity: 0.9,
    toneMappingExposure: 0.95,
    contactShadowOpacity: 0.3,
    shadowBias: -0.0001,
  },
  overcast: {
    id: "overcast",
    label: "Overcast",
    icon: "Cloud",
    hdriUrl:
      "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/overcast_soil_puresky_1k.hdr",
    sunPosition: [5, 30, 10],
    sunIntensity: 0.8,
    sunColor: "#dde4ee",
    fillPosition: [-6, 15, -4],
    fillIntensity: 0.5,
    fillColor: "#c8d0dd",
    ambientIntensity: 0.55,
    hemisphereTopColor: "#b0b8c8",
    hemisphereBottomColor: "#8a7d6b",
    hemisphereIntensity: 0.5,
    envIntensity: 0.7,
    toneMappingExposure: 1.05,
    contactShadowOpacity: 0.2,
    shadowBias: -0.0002,
  },
  evening: {
    id: "evening",
    label: "Evening",
    icon: "Moon",
    hdriUrl:
      "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/dikhololo_night_1k.hdr",
    sunPosition: [-5, 3, 15],
    sunIntensity: 0.4,
    sunColor: "#4466aa",
    fillPosition: [8, 6, -4],
    fillIntensity: 0.2,
    fillColor: "#334466",
    ambientIntensity: 0.2,
    hemisphereTopColor: "#1a1a3e",
    hemisphereBottomColor: "#2d2416",
    hemisphereIntensity: 0.25,
    envIntensity: 0.5,
    toneMappingExposure: 1.3,
    contactShadowOpacity: 0.15,
    shadowBias: -0.0003,
  },
};

/** Return a preset by id, falling back to `daylight` when the id is unknown. */
export function getPreset(id: string): EnvironmentPreset {
  return ENVIRONMENT_PRESETS[id] ?? ENVIRONMENT_PRESETS.daylight;
}

/** All available preset ids in definition order. */
export function getPresetIds(): string[] {
  return Object.keys(ENVIRONMENT_PRESETS);
}
