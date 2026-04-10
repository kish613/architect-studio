/**
 * BIM-first public surface.
 *
 * This module re-exports the canonical BIM schema and the load/parse helpers
 * so the rest of the app can `import ... from "@shared/bim"` without digging
 * into submodules. The canonical BIM JSON is the source of truth — Pascal
 * SceneData is a compatibility layer derived from it.
 */

export * from "./canonical-schema.js";
export * from "./load.js";
