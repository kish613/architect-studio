/**
 * Performance Budget — detects device GPU tier and provides quality settings
 * for the BIM 3D viewer. Low-tier devices get fewer effects but still see
 * the full scene; high-end devices get DOF, bloom, ground reflections, etc.
 */

import type * as THREE from "three";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type PerformanceTier = "low" | "medium" | "high";

export interface PerformanceBudget {
  tier: PerformanceTier;
  textureResolution: "512" | "1K" | "2K";
  maxTexturesInMemory: number;
  enableDof: boolean;
  enableGroundReflection: boolean;
  enableBloom: boolean;
  enableAo: boolean;
  shadowMapSize: number;
  modelResolution: "1k" | "2k";
}

// ─────────────────────────────────────────────────────────────
// Detection
// ─────────────────────────────────────────────────────────────

/**
 * Detect the performance tier of the current device by inspecting the
 * WebGL renderer string, max texture size, and device pixel ratio.
 */
export function detectPerformanceTier(gl: THREE.WebGLRenderer): PerformanceTier {
  const ctx = gl.getContext();
  const maxTextureSize = ctx.getParameter(ctx.MAX_TEXTURE_SIZE) as number;
  const dpr = window.devicePixelRatio || 1;

  // Try to get the unmasked renderer string via the debug extension
  const debugInfo = ctx.getExtension("WEBGL_debug_renderer_info");
  const renderer = debugInfo
    ? (ctx.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string)
    : "";

  const isLowEnd =
    /Intel|Mesa|SwiftShader|llvmpipe/i.test(renderer) ||
    maxTextureSize < 8192;

  const isHighEnd =
    /RTX|RX 6[0-9]|RX 7[0-9]|M[2-9] (Pro|Max|Ultra)|Arc A7/i.test(renderer) ||
    (dpr >= 2 && maxTextureSize >= 16384);

  if (isLowEnd) return "low";
  if (isHighEnd) return "high";
  return "medium";
}

// ─────────────────────────────────────────────────────────────
// Budget presets
// ─────────────────────────────────────────────────────────────

const BUDGETS: Record<PerformanceTier, PerformanceBudget> = {
  low: {
    tier: "low",
    textureResolution: "512",
    maxTexturesInMemory: 15,
    enableDof: false,
    enableGroundReflection: false,
    enableBloom: false,
    enableAo: true,
    shadowMapSize: 2048,
    modelResolution: "1k",
  },
  medium: {
    tier: "medium",
    textureResolution: "1K",
    maxTexturesInMemory: 40,
    enableDof: true,
    enableGroundReflection: true,
    enableBloom: true,
    enableAo: true,
    shadowMapSize: 4096,
    modelResolution: "1k",
  },
  high: {
    tier: "high",
    textureResolution: "2K",
    maxTexturesInMemory: 60,
    enableDof: true,
    enableGroundReflection: true,
    enableBloom: true,
    enableAo: true,
    shadowMapSize: 4096,
    modelResolution: "2k",
  },
};

/**
 * Return the performance budget for a given tier. The budget object
 * controls texture resolution, effect toggles, shadow quality, etc.
 */
export function getPerformanceBudget(tier: PerformanceTier): PerformanceBudget {
  return BUDGETS[tier];
}
